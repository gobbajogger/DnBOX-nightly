#!/usr/bin/env python3
"""Local gate contract tests; no browser, device or baseline approval is implied."""
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch
import full_page_capture as capture
from installer_package import read_package
from hashlib import sha256
import zlib
from PIL import Image

spec = importlib.util.spec_from_file_location('visual_gate', Path(__file__).with_name('visual_gate.py'))
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)

class MountedPackageTests(unittest.TestCase):
    def test_verified_bytes_are_served_without_network(self):
        data = b"visual package integrity fixture"
        digest = sha256(data).hexdigest()
        url = f"https://gobbajogger.github.io/DnBOX-nightly/artifacts/nightly-dev/{digest}/fixture.fwsc"
        with tempfile.TemporaryDirectory() as directory, patch("installer_package.urlopen") as fetch:
            (Path(directory) / "fixture.fwsc").write_bytes(data)
            self.assertEqual(read_package(url, len(data), digest, directory), data)
            fetch.assert_not_called()

    def test_truncated_and_same_size_unverified_files_cannot_be_served(self):
        data = b"visual package integrity fixture"
        digest = sha256(data).hexdigest()
        url = f"https://gobbajogger.github.io/DnBOX-nightly/artifacts/nightly-dev/{digest}/fixture.fwsc"
        for damaged in [data[:-1], b"x" + data[1:]]:
            with tempfile.TemporaryDirectory() as directory:
                (Path(directory) / "fixture.fwsc").write_bytes(damaged)
                with self.assertRaisesRegex(ValueError, "Size or SHA-256 mismatch"):
                    read_package(url, len(data), digest, directory)


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

    def test_full_page_routes_keep_native_capture_for_regular_sizes(self):
        page = Mock()
        page.screenshot.return_value = self.image
        page.evaluate.return_value = [390, 1000, 0, 0, 390, 844, 1]
        self.assertEqual(capture.capture_full_page(page, 'projects/index.html', 'fixture'), self.image)
        page.evaluate.assert_not_called()
        page.screenshot.assert_called_once_with(full_page=True)
        page.screenshot.reset_mock()
        with patch.object(capture.time, 'monotonic', side_effect=[10, 12, 14]):
            self.assertEqual(capture.capture_full_page(page, 'builds/index.html', 'fixture'), self.image)
        page.screenshot.assert_called_once_with(full_page=True, timeout=28_000)

    def test_invalid_native_builds_png_also_fails(self):
        page = Mock()
        page.evaluate.return_value = [30, 30, 0, 0, 30, 30, 1]
        page.screenshot.return_value = self.image[:-12]
        with self.assertRaisesRegex(RuntimeError, 'small-builds full-page capture failed'):
            capture.capture_full_page(page, 'builds/index.html', 'small-builds')

    def test_first_paint_settles_fractional_height_before_any_band_is_retained(self):
        original = [3, 6, 0, 0, 3, 2, 1]
        painted = [3, 7, *original[2:]]
        page = Mock()
        page.evaluate.side_effect = [original, painted, painted]
        clips = []
        def screenshot(*, full_page, clip, timeout):
            clips.append((clip['y'], clip['width'], clip['height']))
            output = io.BytesIO()
            Image.new('RGB', (clip['width'], clip['height']), 'red').save(output, format='PNG')
            return output.getvalue()
        page.screenshot.side_effect = screenshot
        with patch.object(capture, 'SINGLE_CAPTURE_PIXELS', 1), patch.object(capture, 'BAND_ROWS', 3):
            png = capture.capture_full_page(page, 'builds/index.html', 'builds-case')
        with Image.open(io.BytesIO(png)) as actual:
            self.assertEqual(actual.size, (3, 7))
            self.assertEqual(actual.getpixel((2, 6)), (255, 0, 0))
        self.assertEqual(clips, [(0, 1, 1), (0, 3, 3), (2, 3, 4), (5, 3, 2)])

    def test_first_paint_rejects_scroll_viewport_or_dpr_drift(self):
        original = [3, 7, 0, 0, 3, 2, 1]
        for index in (0, 2, 3, 4, 5, 6):
            with self.subTest(index=index):
                changed = original.copy()
                changed[index] += 1
                page = Mock()
                page.evaluate.side_effect = [original, changed]
                with patch.object(capture, 'SINGLE_CAPTURE_PIXELS', 1), patch.object(capture, 'BAND_ROWS', 3):
                    with self.assertRaisesRegex(RuntimeError, 'viewport changed'):
                        capture.capture_full_page(page, 'builds/index.html', 'builds-case')
                self.assertEqual(page.screenshot.call_count, 1)

    def test_bands_retain_every_row_and_reject_a_changed_seam(self):
        expected = Image.new('RGBA', (3, 7))
        expected.putdata([(x, y, 50, y + 17) for y in range(7) for x in range(3)])
        for mutate in (False, True):
            page = Mock()
            page.evaluate.return_value = [3, 7, 0, 0, 3, 2, 1]
            def clipped_png(full_page, clip, timeout):
                self.assertTrue(full_page)
                self.assertTrue(0 < timeout <= 30_000)
                y = clip['y']
                band = expected.crop((0, y, 3, y + clip['height']))
                if mutate and y > 0:
                    band.putpixel((0, 0), (1, 2, 3, 4))
                data = io.BytesIO()
                band.save(data, format='PNG')
                return data.getvalue()
            page.screenshot.side_effect = clipped_png
            with patch.object(capture, 'SINGLE_CAPTURE_PIXELS', 1), patch.object(capture, 'BAND_ROWS', 3):
                if mutate:
                    with self.assertRaisesRegex(RuntimeError, 'build-history.*seam'):
                        capture.capture_full_page(page, 'builds/index.html', 'build-history')
                else:
                    data = capture.capture_full_page(page, 'builds/index.html', 'build-history')
                    with Image.open(io.BytesIO(data)) as actual:
                        self.assertEqual((actual.size, actual.mode), (expected.size, expected.mode))
                        self.assertEqual(actual.tobytes(), expected.tobytes())

    def test_capture_rejects_a_complete_image_after_the_total_deadline(self):
        page = Mock()
        page.evaluate.return_value = [30, 30, 0, 0, 30, 10, 1]
        elapsed = [0]
        def capture_band(*, full_page, clip, timeout):
            self.assertTrue(full_page)
            if clip['width'] == 1:
                self.assertEqual(timeout, 30_000)
                elapsed[0] += 1
            else:
                self.assertEqual(timeout, 29_000 if clip['y'] == 0 else 2_000)
                elapsed[0] += 27 if clip['y'] == 0 else 3
            image = Image.new('RGB', (clip['width'], clip['height']))
            data = io.BytesIO()
            image.save(data, format='PNG')
            return data.getvalue()
        page.screenshot.side_effect = capture_band
        with patch.object(capture, 'SINGLE_CAPTURE_PIXELS', 1), patch.object(capture, 'BAND_ROWS', 15):
            with patch.object(capture.time, 'monotonic', side_effect=lambda: elapsed[0]):
                with self.assertRaisesRegex(RuntimeError, 'build-history.*exceeded 30 seconds'):
                    capture.capture_full_page(page, 'builds/index.html', 'build-history')
        self.assertEqual(page.screenshot.call_count, 3)

    def test_bands_reject_invalid_png_and_changed_document(self):
        size = [3, 6, 0, 0, 3, 2, 1]
        image = Image.new('RGB', (3, 6), 'black')
        for defect in ('missing-end', 'bad-data-crc', 'extra-end', 'truncated', 'wrong-width', 'changed-geometry'):
            with self.subTest(defect=defect):
                page = Mock()
                page.evaluate.side_effect = [size, size, [3, 7, *size[2:]] if defect == 'changed-geometry' else size]
                def screenshot(full_page, clip, timeout):
                    self.assertTrue(full_page)
                    self.assertLessEqual(timeout, 30_000)
                    y = clip['y']
                    band = image.crop((0, y, 2 if defect == 'wrong-width' else 3, y + clip['height']))
                    data = io.BytesIO()
                    band.save(data, format='PNG')
                    raw = data.getvalue()
                    if defect == 'missing-end':
                        return raw[:-12]
                    if defect == 'bad-data-crc':
                        return raw[:-13] + bytes([raw[-13] ^ 128]) + raw[-12:]
                    if defect == 'extra-end':
                        return raw + raw[-12:]
                    if defect == 'truncated':
                        return raw[:20]
                    return raw
                page.screenshot.side_effect = screenshot
                with patch.object(capture, 'SINGLE_CAPTURE_PIXELS', 1), patch.object(capture, 'BAND_ROWS', 3):
                    with self.assertRaisesRegex(RuntimeError, 'builds-case full-page capture failed'):
                        capture.capture_full_page(page, 'builds/index.html', 'builds-case')

    def test_bands_share_one_deadline_and_reject_late_completion(self):
        page = Mock()
        page.evaluate.return_value = [30, 30, 0, 0, 30, 20, 1]
        timeouts = []
        def screenshot(full_page, clip, timeout):
            timeouts.append(timeout)
            band = Image.new('RGB', (clip['width'], clip['height']), 'black')
            data = io.BytesIO()
            band.save(data, format='PNG')
            return data.getvalue()
        page.screenshot.side_effect = screenshot
        with patch.object(capture, 'SINGLE_CAPTURE_PIXELS', 1), patch.object(capture, 'BAND_ROWS', 20):
            with patch.object(capture.time, 'monotonic', side_effect=[10, 11, 15, 32, 41]):
                with self.assertRaisesRegex(RuntimeError, 'exceeded 30 seconds'):
                    capture.capture_full_page(page, 'builds/index.html', 'builds-case')
        self.assertEqual(timeouts, [29_000, 25_000, 8_000])

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
