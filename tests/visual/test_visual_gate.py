#!/usr/bin/env python3
"""Local gate contract tests; no browser, device or baseline approval is implied."""
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zlib
from PIL import Image

spec = importlib.util.spec_from_file_location('visual_gate', Path(__file__).with_name('visual_gate.py'))
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)

def png(color):
    out = io.BytesIO()
    Image.new('RGB', (30, 30), color).save(out, format='PNG')
    return out.getvalue()

class GateContract(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        gate.SNAP = Path(self.temp.name) / 'snapshots'
        gate.OUT = Path(self.temp.name) / 'actual'
        gate.UPDATE = False
        gate.ONLY = None
        self.image = png('black')

    def compare(self, image=None):
        result = []
        gate.compare('screen', self.image if image is None else image, result)
        return result

    def approve(self):
        gate.SNAP.mkdir(parents=True, exist_ok=True)
        (gate.SNAP / 'screen.png').write_bytes(self.image)

    def test_missing_baseline_is_reported_not_created(self):
        result = self.compare()
        self.assertEqual(result[0][1], 'NOBASE')
        self.assertFalse((gate.SNAP / 'screen.png').exists())
        self.assertEqual(gate.exit_status(result, ['clipped control'], []), 1)

    def test_proposal_is_not_a_pass(self):
        gate.UPDATE = True
        result = self.compare()
        self.assertEqual(result[0][1], 'BASELINE')
        self.assertEqual(gate.exit_status(result, [], []), 1)

    def test_approved_identical_pixels_pass_three_repeats(self):
        self.approve()
        for _ in range(3):
            result = self.compare()
            self.assertEqual(result[0][1], 'PASS')
            self.assertEqual(gate.exit_status(result, [], []), 0)

    def test_identical_png_skips_pixel_arrays_and_removes_actual(self):
        self.approve()
        with patch.object(gate.np, 'asarray', side_effect=AssertionError('unexpected pixel array')):
            self.assertEqual(self.compare(), [('screen', 'PASS', 0.0)])
        self.assertFalse((gate.OUT / 'screen-actual.png').exists())

    def test_identical_png_with_invalid_pixels_still_fails(self):
        broken = bytearray(self.image)
        chunk = broken.index(b'IDAT')
        size = int.from_bytes(broken[chunk - 4:chunk], 'big')
        end = chunk + 4 + size
        broken[chunk + 4:end] = bytes(size)
        broken[end:end + 4] = zlib.crc32(broken[chunk:end]).to_bytes(4, 'big')
        self.image = bytes(broken)
        self.approve()
        # Valid chunk CRCs alone cannot prove the compressed pixels decode.
        with Image.open(io.BytesIO(self.image)) as candidate:
            candidate.verify()
        with self.assertRaises(OSError):
            self.compare()

    def test_identical_png_with_invalid_chunk_crc_fails(self):
        broken = bytearray(self.image)
        chunk = broken.index(b'IDAT')
        end = chunk + 4 + int.from_bytes(broken[chunk - 4:chunk], 'big')
        broken[end] ^= 1
        self.image = bytes(broken)
        self.approve()
        with self.assertRaises((SyntaxError, OSError)):
            self.compare()

    def test_identical_png_requires_complete_end_chunk(self):
        valid = self.image
        for description, damaged in [('missing CRC', valid[:-4]),
                                     ('wrong CRC', valid[:-1] + bytes([valid[-1] ^ 1]))]:
            with self.subTest(description):
                self.image = damaged
                self.approve()
                with self.assertRaises((OSError, SyntaxError, ValueError)):
                    self.compare()

    def test_different_encoding_of_same_pixels_uses_pixel_comparison(self):
        self.approve()
        differently_encoded = io.BytesIO()
        Image.new('RGB', (30, 30), 'black').save(differently_encoded, 'PNG', compress_level=0)
        self.assertNotEqual(differently_encoded.getvalue(), self.image)
        with patch.object(gate.np, 'asarray', wraps=gate.np.asarray) as arrays:
            self.assertEqual(self.compare(differently_encoded.getvalue()), [('screen', 'PASS', 0.0)])
        self.assertGreaterEqual(arrays.call_count, 2)

    def test_render_mutant_fails_and_corrected_render_passes(self):
        self.approve()
        self.assertEqual(self.compare(png('white'))[0][1], 'FAIL')
        self.assertEqual(self.compare()[0][1], 'PASS')

    def test_size_change_fails(self):
        self.approve()
        buf = io.BytesIO(); Image.new('RGB', (31, 30)).save(buf, format='PNG')
        self.assertEqual(self.compare(buf.getvalue())[0][1], 'FAIL')

    def test_filtered_passing_subset_cannot_qualify_publication(self):
        gate.ONLY = "remote-roll"
        self.assertEqual(gate.exit_status([("remote-roll", "PASS", 0)], [], []), 1)

    def test_browser_errors_empty_runs_and_header_errors_fail(self):
        passed = [('screen', 'PASS', 0)]
        self.assertEqual(gate.exit_status(passed, [], ['uncaught error']), 1)
        self.assertEqual(gate.exit_status(passed, ['clipped control'], []), 1)
        self.assertEqual(gate.exit_status([], [], []), 1)

if __name__ == '__main__':
    unittest.main()
