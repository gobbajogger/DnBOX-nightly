#!/usr/bin/env python3
"""Local gate contract tests; no browser, device or baseline approval is implied."""
import importlib.util
import io
import json
import re
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch
import full_page_capture as capture
from installer_package import installer_responses, read_package
from hashlib import sha256
import zlib
from PIL import Image

spec = importlib.util.spec_from_file_location('visual_gate', Path(__file__).with_name('visual_gate.py'))
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)

class MountedPackageTests(unittest.TestCase):
    def test_mounted_installer_requires_a_package_while_empty_preview_can_render(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            installer = root / "web/product-site/install/index.html"
            installer.parent.mkdir(parents=True)
            installer.write_text('\nconst catalog = {"latest":null,"versions":[]};')
            attach = installer_responses(root)
            mounted = Mock()
            with self.assertRaisesRegex(ValueError, "requires a default release package"):
                attach(mounted, require_package=True)
            mounted.route.assert_not_called()
            preview = Mock()
            self.assertIsNone(attach(preview))
            self.assertEqual(preview.route.call_count, 1)

    def test_mounted_installer_accepts_the_mke_only_catalog(self):
        digest = "a" * 64
        url = f"https://gobbajogger.github.io/DnBOX-nightly/artifacts/nightly-dev/{digest}/mke.fwsc"
        catalog = {"latest": "release", "versions": [{"version": "release", "display_version": "0.0.26",
                   "models": {"mke": {"pkg": url, "sha256": digest, "size": 1}}}]}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            installer = root / "web/product-site/install/index.html"
            installer.parent.mkdir(parents=True)
            installer.write_text("\nconst catalog = " + json.dumps(catalog) + ";")
            page = Mock()
            self.assertEqual(installer_responses(root)(page, require_package=True), "mke.fwsc")
            self.assertEqual(page.route.call_count, 2)

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

    def test_legacy_manual_keeps_the_entire_settled_footer_on_narrow_viewports(self):
        initial = [3, 5, 0, 0, 3, 2, 1]
        painted = [3, 25, *initial[2:]]
        page = Mock()
        page.evaluate.side_effect = [initial, painted, painted]
        clips = []

        def screenshot(*, full_page, clip, timeout):
            self.assertTrue(full_page)
            self.assertTrue(0 < timeout <= 30_000)
            clips.append(clip)
            image = Image.new('RGB', (clip['width'], clip['height']))
            for y in range(image.height):
                image.paste((0, clip['y'] + y, 10), (0, y, image.width, y + 1))
            data = io.BytesIO()
            image.save(data, format='PNG')
            return data.getvalue()

        page.screenshot.side_effect = screenshot
        with patch.object(capture, 'BAND_ROWS', 4), patch.object(capture, 'MANUAL_BAND_ROWS', 3):
            data = capture.capture_full_page(page, 'manual/legacy.html', 'legacy-mobile')
        with Image.open(io.BytesIO(data)) as output:
            self.assertEqual(output.size, (3, 25))
            self.assertEqual([output.getpixel((1, y)) for y in range(25)], [(0, y, 10) for y in range(25)])
        self.assertLessEqual(max(clip['height'] for clip in clips), 4)

    def test_legacy_batches_preserve_the_viewport_and_total_deadline(self):
        for width, viewport_height, rows in [(390, 844, 8192), (844, 390, 4968),
                                             (1024, 640, 4095), (1440, 900, 2048)]:
            with self.subTest(width=width):
                initial = [width, 45_591, 0, 0, width, viewport_height, 1]
                painted = [width, 45_592, *initial[2:]]
                page = Mock()
                page.evaluate.side_effect = [initial, painted]
                with patch.object(capture.time, 'monotonic', side_effect=[10.0, 12.0]), \
                     patch.object(capture, 'capture_bands', return_value=b'captured') as bands:
                    self.assertEqual(capture.capture_full_page(page, 'manual/legacy.html', 'legacy'), b'captured')
                page.screenshot.assert_called_once_with(full_page=True, clip=dict(x=0, y=0, width=1, height=1),
                                                        timeout=28_000)
                bands.assert_called_once_with(page, painted, 40.0, band_rows=rows)
                page.set_viewport_size.assert_not_called()

    def test_legacy_rejects_a_row_and_seam_over_the_tile_budget(self):
        geometry = [2_097_153, 45_592, 0, 0, 1024, 640, 1]
        page = Mock()
        page.evaluate.return_value = geometry
        with patch.object(capture, 'capture_bands') as bands:
            with self.assertRaisesRegex(RuntimeError, 'row and seam exceed'):
                capture.capture_full_page(page, 'manual/legacy.html', 'legacy-wide')
        bands.assert_not_called()

    def test_short_manuals_capture_the_complete_painted_document(self):
        initial = [3, 4, 0, 0, 3, 2, 1]
        painted = [3, 7, *initial[2:]]
        for route in ('manual/projects-guide.html', 'manual/protocol.html'):
            with self.subTest(route=route):
                for failure in (None, 'short-image', 'changing-layout'):
                    with self.subTest(failure=failure):
                        page = Mock()
                        final = initial if failure == 'changing-layout' else painted
                        page.evaluate.side_effect = [initial, painted, final]
                        warm = False

                        def screenshot(*, full_page, clip=None, timeout=None):
                            nonlocal warm
                            self.assertTrue(full_page)
                            data = io.BytesIO()
                            if clip:
                                self.assertEqual(clip, dict(x=0, y=0, width=1, height=1))
                                warm = True
                                size = (1, 1)
                            else:
                                size = (3, 7 if warm and failure != 'short-image' else 4)
                            Image.new('RGB', size, 'red').save(data, format='PNG')
                            return data.getvalue()

                        page.screenshot.side_effect = screenshot
                        if failure:
                            with self.assertRaisesRegex(RuntimeError, 'full-page capture failed'):
                                capture.capture_full_page(page, route, 'manual-short')
                        else:
                            data = capture.capture_full_page(page, route, 'manual-short')
                            with Image.open(io.BytesIO(data)) as image:
                                self.assertEqual(image.size, (3, 7))
                                self.assertEqual(image.getpixel((2, 6)), (255, 0, 0))

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

    def test_installer_routes_only_pause_the_two_public_requests(self):
        page = Mock()
        gate.installer_responses()(page)
        patterns = [call.args[0] for call in page.route.call_args_list]
        self.assertEqual(len(patterns), 2)
        # Playwright sends callable URL matchers to Chromium as a catch-all.
        for pattern in patterns:
            self.assertIsInstance(pattern, re.Pattern)
            self.assertIsNone(pattern.search('http://127.0.0.1:8000/product-site/index.html'))
        self.assertIsNotNone(patterns[0].fullmatch(
            'https://api.github.com/search/issues?q=repo%3Agobbajogger%2FDnBOX+is%3Aissue+in%3Atitle+%22Install+report%22&per_page=100&page=1'
        ))

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

    def test_exact_pixel_tolerance_changed_fraction_and_difference_image(self):
        base = Image.new('RGB', (200, 10), (160, 110, 70))
        original = io.BytesIO()
        base.save(original, 'PNG')
        self.image = original.getvalue()
        self.approve()
        for significant in (1, 2, 3):
            with self.subTest(significant=significant):
                actual = base.convert('RGBA')
                actual.putpixel((0, 1), (185, 85, 70, 0))  # ±25 and alpha do not count.
                for x in range(significant):
                    actual.putpixel((x, 0), (160, 110, 70 + (26 if x % 2 else -26), 8))
                out = io.BytesIO()
                actual.save(out, 'PNG')
                status = 'FAIL' if significant == 3 else 'PASS'
                self.assertEqual(self.compare(out.getvalue()), [('screen', status, significant / 2000)])
                if significant == 3:
                    expected = Image.new('RGB', base.size, (48, 33, 21))
                    for x in range(significant):
                        expected.putpixel((x, 0), (255, 0, 255))
                    with Image.open(gate.OUT / 'screen-diff.png') as diff:
                        self.assertEqual(diff.mode, 'RGB')
                        self.assertEqual(diff.tobytes(), expected.tobytes())
                    self.assertEqual((gate.OUT / 'screen-actual.png').read_bytes(), out.getvalue())
                else:
                    self.assertFalse((gate.OUT / 'screen-diff.png').exists())

    def test_all_png_filters_maintain_previous_row_across_strips(self):
        from PIL.PngImagePlugin import putchunk
        import struct
        for mode, channels, color_type in [('RGB', 3, 2), ('RGBA', 4, 6)]:
            with self.subTest(mode=mode):
                width, height = 5, 645
                out = io.BytesIO()
                out.write(b'\x89PNG\r\n\x1a\n')
                putchunk(out, b'IHDR', struct.pack('>IIBBBBB', width, height, 8, color_type, 0, 0, 0))
                raw = b''.join(bytes([y % 5]) + bytes((17 * y + x) % 256 for x in range(width * channels))
                               for y in range(height))
                encoded = zlib.compress(raw)
                for start in range(0, len(encoded), 109):
                    putchunk(out, b'IDAT', encoded[start:start + 109])
                putchunk(out, b'IEND', b'')
                self.image = out.getvalue()
                self.approve()
                with Image.open(io.BytesIO(self.image)) as whole:
                    rgb = whole.convert('RGB')
                    # Force another color layout/encoding. This exercises pixel conversion, including alpha.
                    alternate = rgb.convert('RGBA' if mode == 'RGB' else 'RGB')
                    different = io.BytesIO()
                    alternate.save(different, 'PNG', compress_level=9)
                self.assertNotEqual(different.getvalue(), self.image)
                self.assertEqual(self.compare(different.getvalue()), [('screen', 'PASS', 0.0)])

    def test_palette_and_grayscale_keep_pillow_rgb_semantics(self):
        for mode in ('P', 'L', 'LA', '1'):
            with self.subTest(mode=mode):
                original = Image.new(mode, (3, 258))
                for y in range(0, 258, 3):
                    original.putpixel((1, y), (190, 40) if mode == 'LA' else 1)
                if mode == 'P':
                    original.putpalette([0, 0, 0, 199, 91, 45] + [0] * 762)
                encoded = io.BytesIO()
                original.save(encoded, 'PNG')
                self.image = encoded.getvalue()
                self.approve()
                decoded_rgb = io.BytesIO()
                original.convert('RGB').save(decoded_rgb, 'PNG')
                self.assertEqual(self.compare(decoded_rgb.getvalue()), [('screen', 'PASS', 0.0)])

    def test_incomplete_or_extra_inflated_rows_and_invalid_filter_raise(self):
        from PIL.PngImagePlugin import putchunk
        import struct
        stride = 1 + 3 * 30
        for label, raw in (('incomplete', bytes(stride * 29)),
                           ('extra', bytes(stride * 30 + 1)),
                           ('invalid filter', b'\x05' + bytes(stride * 30 - 1))):
            with self.subTest(label=label):
                out = io.BytesIO()
                out.write(b'\x89PNG\r\n\x1a\n')
                putchunk(out, b'IHDR', struct.pack('>IIBBBBB', 30, 30, 8, 2, 0, 0, 0))
                putchunk(out, b'IDAT', zlib.compress(raw))
                putchunk(out, b'IEND', b'')
                self.approve()
                with self.assertRaises((ValueError, OSError)):
                    self.compare(out.getvalue())

    def test_valid_padding_after_final_idat_stream_preserves_pixels(self):
        # PNG 11.2.3 allows padding inside the last IDAT after the zlib stream.
        self.approve()
        size = int.from_bytes(self.image[33:37], 'big')
        self.assertEqual(self.image[37:41], b'IDAT')
        data = self.image[41:41 + size] + bytes(5)
        alternate = (self.image[:33] + len(data).to_bytes(4, 'big') + b'IDAT' + data
                     + zlib.crc32(b'IDAT' + data).to_bytes(4, 'big') + self.image[45 + size:])
        self.assertEqual(self.compare(alternate), [('screen', 'PASS', 0.0)])

    def test_failed_streaming_diff_cannot_replace_previous_output(self):
        destination = gate.write_actual_output('screen-diff.png', b'previous')

        def interrupted(output):
            output.write(b'partial')
            raise OSError('interrupted comparison output')

        with self.assertRaisesRegex(OSError, 'interrupted'):
            gate.write_actual_output('screen-diff.png', interrupted)
        self.assertEqual(destination.read_bytes(), b'previous')
        self.assertEqual(list(gate.OUT.iterdir()), [destination])

if __name__ == '__main__':
    unittest.main()
