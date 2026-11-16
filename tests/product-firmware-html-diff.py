"""Synthetic algorithm tests only, never a claim that real HTML matches firmware."""
import copy
import importlib.util
import hashlib
import tempfile
from PIL import Image
from pathlib import Path
import unittest
spec = importlib.util.spec_from_file_location('compare', Path(__file__).resolve().parents[1] / 'scripts/compare-firmware-html.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
FIRMWARE, WEBSITE = 'a' * 40, 'b' * 40

def manifests():
    native = {'productionSourceCommit': FIRMWARE, 'coverageComplete': True, 'notRun': [],
              'screens': [{'id': 'screen', 'path': 'screen.png', 'width': 240, 'height': 240, 'sha256': 'c' * 64}]}
    html = dict(copy.deepcopy(native), websiteSourceCommit=WEBSITE, browserCapture=True)
    return native, html

class Comparison(unittest.TestCase):
    def test_identical_synthetic_pixels_pass_only_scoped_comparison(self):
        n, h = manifests()
        result = module.compare(n, h, FIRMWARE, WEBSITE, lambda *args: bytes(240 * 240 * 4))
        self.assertEqual(result['status'], 'PASS')
        self.assertEqual(result['allowedDifferentPixels'], 0)
        self.assertIn('not-independent-review', result['scope'])
    def test_one_changed_pixel_fails_without_tolerance(self):
        n, h = manifests()
        def pixels(kind, row):
            b = bytearray(240 * 240 * 4)
            if kind == 'html': b[0] = 1
            return bytes(b)
        result = module.compare(n, h, FIRMWARE, WEBSITE, pixels)
        self.assertEqual(result['status'], 'FAIL')
        self.assertEqual(result['screens'][0]['differentPixels'], 1)
    def test_source_coverage_capture_and_inventory_mutants_fail_before_read(self):
        changes = [lambda n,h: n.update(coverageComplete=False), lambda n,h: h.update(notRun=['browser']),
                   lambda n,h: n.update(productionSourceCommit='d'*40), lambda n,h: h.update(websiteSourceCommit='d'*40),
                   lambda n,h: h.update(browserCapture=False), lambda n,h: h.update(screens=[]),
                   lambda n,h: h['screens'].append(copy.deepcopy(h['screens'][0])),
                   lambda n,h: h['screens'][0].update(id='different'), lambda n,h: h['screens'][0].update(width=239)]
        for change in changes:
            n,h=manifests(); change(n,h)
            def forbidden(*args): self.fail('unadmitted screenshot read')
            self.assertEqual(module.compare(n,h,FIRMWARE,WEBSITE,forbidden)['status'],'FAIL')
    def test_missing_pin_and_bad_pixel_dimensions_fail(self):
        n,h=manifests()
        self.assertEqual(module.compare(n,h,'',WEBSITE,lambda *args:b'')['status'],'FAIL')
        self.assertEqual(module.compare(n,h,FIRMWARE,WEBSITE,lambda *args:b'')['status'],'FAIL')
    def test_invalid_manifest_and_digest_types_fail_closed(self):
        n,h=manifests(); h['screens'][0]['sha256']=3
        self.assertEqual(module.compare(n,h,FIRMWARE,WEBSITE,lambda *args:b'')['status'],'FAIL')
        self.assertEqual(module.compare([],h,FIRMWARE,WEBSITE,lambda *args:b'')['status'],'FAIL')
        self.assertEqual(module.compare(n,h,3,WEBSITE,lambda *args:b'')['status'],'FAIL')
    def test_bounded_real_png_load_checks_digest_and_exact_dimensions(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'frame.png'; Image.new('RGBA',(240,240),(1,2,3,255)).save(path)
            row={'path':'frame.png','sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
            loader=module.file_loader({'native':directory})
            self.assertEqual(loader('native',row),bytes([1,2,3,255])*(240*240))
            with self.assertRaises(ValueError): loader('native',dict(row,sha256='0'*64))
            Image.new('RGBA',(239,240)).save(path);row['sha256']=hashlib.sha256(path.read_bytes()).hexdigest()
            with self.assertRaises(ValueError): loader('native',row)
    def test_symlink_screenshot_refused_even_with_matching_target_hash(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'frame.png'; Image.new('RGBA',(240,240)).save(path)
            (Path(directory)/'alias.png').symlink_to(path)
            with self.assertRaises(ValueError): module.file_loader({'native':directory})('native',{'path':'alias.png','sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    def test_path_escape_and_missing_files_refused(self):
        loader=module.file_loader({'native':Path(__file__).parent})
        for path in ['../outside.png','/tmp/outside.png','missing.png','image.svg']:
            with self.assertRaises(ValueError): loader('native',{'path':path,'sha256':'c'*64})

if __name__ == '__main__': unittest.main()
