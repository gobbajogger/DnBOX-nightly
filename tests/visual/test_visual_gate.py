#!/usr/bin/env python3
"""Local gate contract tests; no browser, device or baseline approval is implied."""
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
import json
from unittest.mock import Mock, patch
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

    def test_full_page_capture_returns_the_single_native_png(self):
        page = Mock()
        page.screenshot.return_value = self.image
        self.assertIs(gate.capture_site_page(page, 'presets/index.html'), self.image)
        page.evaluate.assert_not_called()
        page.screenshot.assert_called_once_with(full_page=True)

        page.reset_mock()
        page.evaluate.return_value = (30, 30)
        self.assertIs(gate.capture_site_page(page, 'builds/index.html'), self.image)
        page.evaluate.assert_called_once()
        page.screenshot.assert_called_once_with(full_page=True, timeout=30_000)

    def manual_page(self, *, rest=None, image=None):
        state = dict(width=4, height=1031, viewport=[3, 3, 1, 0, 0], fonts='loaded', images=[])
        page = Mock()
        page.wait_for_function.side_effect = [
            Mock(json_value=Mock(return_value=json.dumps(value)))
            for value in [state, state | (rest or {})]]

        def native_band(*, full_page, clip, timeout):
            self.assertTrue(full_page)
            self.assertGreater(timeout, 0)
            self.assertLessEqual(timeout, 30_000)
            x, y, width, height = (clip[k] for k in ('x', 'y', 'width', 'height'))
            self.assertEqual((x, width), (0, 4))
            if image is not None:
                return image
            data = io.BytesIO()
            band = Image.new('RGB', (width, height))
            band.putdata([(column, (y + row) % 251, (y + row) // 251)
                          for row in range(height) for column in range(width)])
            band.save(data, format='PNG')
            return data.getvalue()
        page.screenshot.side_effect = native_band
        return page

    def test_manual_joins_all_native_pixels_including_overhang_seam_and_last_row(self):
        page = self.manual_page(rest={'height': 1035})
        result = gate.capture_site_page(page, 'manual/original/index.html')
        with Image.open(io.BytesIO(result)) as output:
            self.assertEqual((output.format, output.mode, output.size), ('PNG', 'RGB', (4, 1031)))
            self.assertEqual(output.tobytes(), bytes(c for y in range(1031) for x in range(4)
                for c in (x, y % 251, y // 251)))
        self.assertEqual([call.kwargs['clip'] for call in page.screenshot.call_args_list],
                         [{'x': 0, 'y': 0, 'width': 4, 'height': 1024},
                          {'x': 0, 'y': 1024, 'width': 4, 'height': 7}])
        for call in page.wait_for_function.call_args_list:
            self.assertGreater(call.kwargs['timeout'], 0)
            self.assertLessEqual(call.kwargs['timeout'], 30_000)

    def test_manual_native_band_size_crc_truncation_and_format_fail_closed(self):
        data = io.BytesIO()
        Image.new('RGB', (4, 1024)).save(data, format='PNG')
        damaged = bytearray(data.getvalue())
        damaged[damaged.index(b'IDAT') + 4] ^= 1
        wrong = io.BytesIO()
        Image.new('RGB', (4, 1024)).save(wrong, format='JPEG')
        for bad in [wrong.getvalue(), self.image, bytes(damaged), data.getvalue()[:-12]]:
            with self.subTest(length=len(bad)):
                page = self.manual_page(image=bad)
                with self.assertRaises((OSError, ValueError, SyntaxError)):
                    gate.capture_site_page(page, 'manual/original/index.html')
                self.assertEqual(page.screenshot.call_count, 1)

    def test_manual_rejects_changed_width_viewport_scroll_fonts_or_lazy_images(self):
        for rest in [{'width': 3}, {'viewport': [3, 3, 1, 0, 1]}, {'fonts': 'loading'},
                     {'images': [['/a.png', True, 1, 1]]}]:
            with self.subTest(rest=rest), self.assertRaisesRegex(ValueError, 'changed during capture'):
                gate.capture_site_page(self.manual_page(rest=rest), 'manual/original/index.html')

    def test_manual_shares_one_deadline_and_propagates_a_native_failure_once(self):
        page = self.manual_page()
        with patch('manual_capture.time.monotonic', side_effect=[0, 0, 1, 31]):
            with self.assertRaisesRegex(TimeoutError, 'exceeded 30 seconds'):
                gate.capture_site_page(page, 'manual/original/index.html')
        self.assertEqual(page.screenshot.call_count, 1)
        self.assertEqual(page.screenshot.call_args.kwargs['timeout'], 29_000)
        page = self.manual_page()
        page.screenshot.side_effect = RuntimeError('renderer lost')
        with self.assertRaisesRegex(RuntimeError, 'renderer lost'):
            gate.capture_site_page(page, 'manual/original/index.html')
        self.assertEqual(page.screenshot.call_count, 1)

    def test_history_budget_has_a_floor_and_a_hard_cap(self):
        for width, height, budget in [(1000, 800, 30_000), (1000, 70_000, 105_000),
                                      (3000, 50_000, 120_000)]:
            with self.subTest(width=width, height=height):
                self.assertEqual(gate.history_capture_timeout_ms(width, height), budget)

    def test_history_capture_rejects_missing_rows_and_truncated_pngs(self):
        page = Mock()
        page.evaluate.return_value = (30, 31)
        page.screenshot.return_value = self.image
        with self.assertRaisesRegex(ValueError, 'Expected full Builds PNG'):
            gate.capture_site_page(page, 'builds/index.html')
        page.evaluate.return_value = (30, 30)
        page.screenshot.return_value = self.image[:-12]
        with self.assertRaises(OSError):
            gate.capture_site_page(page, 'builds/index.html')

    def test_history_capture_rejects_wrong_format_and_corrupt_png_data(self):
        page = Mock()
        page.evaluate.return_value = (30, 30)
        jpeg = io.BytesIO()
        Image.new('RGB', (30, 30)).save(jpeg, format='JPEG')
        page.screenshot.return_value = jpeg.getvalue()
        with self.assertRaisesRegex(ValueError, 'Expected full Builds PNG'):
            gate.capture_site_page(page, 'builds/index.html')
        damaged = bytearray(self.image)
        damaged[damaged.index(b'IDAT') + 4] ^= 1
        page.screenshot.return_value = bytes(damaged)
        with self.assertRaisesRegex(SyntaxError, 'checksum'):
            gate.capture_site_page(page, 'builds/index.html')

    def test_failed_history_capture_propagates_without_retry(self):
        page = Mock()
        page.evaluate.return_value = (1000, 70_000)
        page.screenshot.side_effect = TimeoutError('native capture exceeded its budget')
        with self.assertRaisesRegex(TimeoutError, 'exceeded its budget'):
            gate.capture_site_page(page, 'builds/index.html')
        page.screenshot.assert_called_once_with(full_page=True, timeout=105_000)

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
