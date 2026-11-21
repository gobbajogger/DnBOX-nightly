# SPDX-License-Identifier: GPL-3.0-only
import io
import unittest
from unittest.mock import Mock, patch

from PIL import Image

import full_page_capture as capture


class OriginalManualCapture(unittest.TestCase):
    def test_stable_large_desktop_uses_painted_geometry_and_one_original_deadline(self):
        geometry = [1440, 29956, 0, 0, 1440, 900, 1]
        page = Mock()
        page.evaluate.return_value = geometry
        with patch.object(capture.time, 'monotonic', side_effect=[10, 12]), \
             patch.object(capture, 'capture_bands', return_value=b'full document') as bands:
            self.assertEqual(capture.capture_full_page(page, 'manual/original/index.html', 'original'), b'full document')
        page.screenshot.assert_called_once_with(full_page=True, clip=dict(x=0, y=0, width=1, height=1), timeout=28_000)
        bands.assert_called_once_with(page, geometry, 40, native_height=29956)

    def test_first_paint_only_accepts_bounded_empty_canvas_below_native_rectangle(self):
        original = [3, 6, 0, 0, 3, 2, 1]
        painted = [3, 7, *original[2:]]
        background = [7, 16, 20]
        for change, failure in [
            ('none', None), ('one changed pixel', 'visible content'), ('solid foreground', 'visible content'),
            ('unstable seam', 'visible content'), ('no solid background', 'not a solid opaque color'),
            ('changed background', 'background changed'), ('moved viewport', 'geometry changed'),
            ('incomplete tail', 'PNG screenshot'), ('late', 'exceeded 30 seconds')
        ]:
            with self.subTest(change=change):
                page = Mock()
                css = None if change == 'no solid background' else background
                last_css = [8, 16, 20] if change == 'changed background' else background
                final = [3, 7, 0, 1, 3, 2, 1] if change == 'moved viewport' else painted
                page.evaluate.side_effect = [original, painted, css, last_css, final]
                clips = []
                def screenshot(*, full_page, clip, timeout):
                    self.assertTrue(full_page)
                    self.assertTrue(0 < timeout <= 30_000)
                    y, width, height = clip['y'], clip['width'], clip['height']
                    clips.append((y, width, height))
                    color = (255, 255, 255) if change == 'solid foreground' else tuple(background)
                    tile = Image.new('RGB', (width, height), color)
                    if y == 5:
                        if change == 'one changed pixel':
                            tile.putpixel((2, 1), (7, 16, 21))
                        if change == 'unstable seam':
                            tile.putpixel((0, 0), (0, 0, 0))
                    else:
                        # Text in the original rectangle must remain at the same position.
                        if y == 0:
                            tile.putpixel((0, 0), (88, 99, 11))
                    image = io.BytesIO()
                    tile.save(image, 'PNG')
                    png = image.getvalue()
                    return png[:-12] if change == 'incomplete tail' and y == 5 else png
                page.screenshot.side_effect = screenshot
                # Last deadline check includes encoding and validation of the native tail.
                clocks = [10, 11, 12, 13, 14, 41 if change == 'late' else 15]
                with patch.object(capture, 'SINGLE_CAPTURE_PIXELS', 1), patch.object(capture, 'BAND_ROWS', 3), \
                     patch.object(capture.time, 'monotonic', side_effect=clocks):
                    if failure:
                        with self.assertRaisesRegex(RuntimeError, failure):
                            capture.capture_full_page(page, 'manual/original/index.html', 'original')
                    else:
                        png = capture.capture_full_page(page, 'manual/original/index.html', 'original')
                        with Image.open(io.BytesIO(png)) as actual:
                            self.assertEqual(actual.size, (3, 6))
                            self.assertEqual(actual.getpixel((0, 0)), (88, 99, 11))
                        self.assertEqual(clips, [(0, 1, 1), (0, 3, 3), (2, 3, 4), (5, 3, 2)])

    def test_manual_rejects_shrink_large_growth_and_changed_viewport_before_banding(self):
        initial = [3, 6, 0, 0, 3, 2, 1]
        for painted in ([3, 5, *initial[2:]], [3, 6 + capture.MANUAL_MAX_PAINT_GROWTH + 1, *initial[2:]],
                        [3, 7, 0, 1, 3, 2, 1]):
            with self.subTest(painted=painted):
                page = Mock()
                page.evaluate.side_effect = [initial, painted]
                with patch.object(capture, 'SINGLE_CAPTURE_PIXELS', 1), patch.object(capture, 'BAND_ROWS', 3):
                    with self.assertRaisesRegex(RuntimeError, 'height changed|viewport changed'):
                        capture.capture_full_page(page, 'manual/original/index.html', 'original')
                self.assertEqual(page.screenshot.call_count, 1)

    def test_three_compact_sizes_and_short_desktop_keep_native_capture(self):
        image = io.BytesIO()
        Image.new('RGB', (1, 1)).save(image, 'PNG')
        png = image.getvalue()
        for width, height, viewport in [(1024, 29912, 640), (844, 29993, 390), (390, 40703, 844), (1440, 1200, 900)]:
            with self.subTest(width=width, height=height):
                page = Mock()
                page.evaluate.return_value = [width, height, 0, 0, width, viewport, 1]
                page.screenshot.return_value = png
                with patch.object(capture.time, 'monotonic', side_effect=[10, 12, 14]), \
                     patch.object(capture, 'capture_bands') as bands:
                    self.assertEqual(capture.capture_full_page(page, 'manual/original/index.html', 'original'), png)
                page.screenshot.assert_called_once_with(full_page=True, timeout=28_000)
                bands.assert_not_called()

    def test_other_manual_routes_keep_native_full_page(self):
        for route in ('manual/index.html', 'manual/original/other.html'):
            with self.subTest(route=route):
                page = Mock()
                capture.capture_full_page(page, route, 'other')
                page.evaluate.assert_not_called()
                page.screenshot.assert_called_once_with(full_page=True)
