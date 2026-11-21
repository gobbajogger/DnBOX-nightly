# SPDX-License-Identifier: GPL-3.0-only
"""Verify the complete sweep schedule and browser lifetimes without rendering."""
from contextlib import ExitStack
import io
import unittest
from unittest.mock import MagicMock, Mock, patch
from PIL import Image
import visual_gate as gate


class VisualViewportContract(unittest.TestCase):
    def run_sweep(self, reject_lane=False):
        events, captures, clicks = [], [], []
        history_pages = []
        image = io.BytesIO()
        Image.new('RGB', (2, 2)).save(image, format='PNG')
        playwright = MagicMock()
        playwright.__enter__.return_value = playwright

        def launch(**options):
            self.assertEqual(options, dict(chromium_sandbox=True, args=[
                '--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb']))
            events.append('launch')
            browser = MagicMock()
            browser.__enter__.return_value = browser
            browser.close.side_effect = lambda: events.append('close browser')
            browser.__exit__.side_effect = lambda *_: browser.close()

            def context(**options):
                size = tuple(options['viewport'].values())
                events.append(size)
                ctx = MagicMock()
                ctx.__enter__.return_value = ctx
                ctx.close.side_effect = lambda: events.append('close context')
                ctx.__exit__.side_effect = lambda *_: ctx.close()

                def page():
                    pg = Mock()
                    def visit(url):
                        if url.endswith('/product-site/builds/index.html'):
                            history_pages.append(pg)
                    pg.goto.side_effect = visit
                    pg.evaluate.return_value = 0
                    pg.screenshot.return_value = image.getvalue()

                    def click(selector):
                        clicks.append((size, selector))
                        if reject_lane and selector == '#lane-param':
                            raise TimeoutError('fixture action timeout')

                    pg.click.side_effect = click
                    return pg

                ctx.new_page.side_effect = page
                return ctx

            browser.new_context.side_effect = context
            return browser

        playwright.chromium.launch.side_effect = launch
        def record(name, _png, results):
            captures.append(name)
            results.append((name, 'PASS', 0))

        sample_navigation = Mock()
        package_admission = Mock(wraps=gate.wait_for_admission)
        with ExitStack() as stack:
            for module, attr, value in [
                (gate, 'sync_playwright', Mock(return_value=playwright)), (gate, 'port', Mock(return_value=49152)),
                (gate.subprocess, 'Popen', Mock()), (gate.time, 'sleep', Mock()),
                (gate, 'validate_capture_output', Mock()), (gate, 'write_actual_output', Mock()),
                (gate, 'header_checks', Mock()), (gate, 'assert_grid_continuity', Mock(return_value={'samples': 1})),
                (gate, 'ssim', Mock(return_value=1)), (gate, 'compare', record),
                (gate, 'sample_navigation_checks', sample_navigation),
                (gate, 'wait_for_admission', package_admission),
                (gate, 'capture_full_page', Mock(return_value=image.getvalue())), (gate, 'ONLY', None),
            ]:
                stack.enter_context(patch.object(module, attr, value))
            if reject_lane:
                with self.assertRaisesRegex(RuntimeError, 'remote-lane-chance-1440x900.*fixture action timeout'):
                    gate.main()
            else:
                with self.assertRaises(SystemExit) as exit_:
                    gate.main()
                self.assertEqual(exit_.exception.code, 0)
                self.assertEqual(
                    [call.args[1] for call in sample_navigation.call_args_list],
                    [f'{w}x{h}' for w, h in gate.SIZES],
                )
                self.assertEqual(len(history_pages), len(gate.SIZES))
                for page in history_pages:
                    registered = {call.args[0] for call in page.on.call_args_list}
                    self.assertTrue({'response', 'requestfailed'} <= registered)
                admitted = [call.args[1] for call in package_admission.call_args_list]
                self.assertEqual(len(admitted), len(gate.SIZES))
                self.assertTrue(all(name.endswith('.fwsc') for name in admitted))
        return events, captures, clicks

    def test_all_cases_keep_original_order_and_each_viewport_closes_before_next(self):
        events, captures, clicks = self.run_sweep()
        sizes = [(1440, 900), (1024, 640), (844, 390), (390, 844)]
        remote = ['sequence', 'lane-chance', 'lane-pitch', 'lane-pan', 'sound', 'mix', 'patterns', 'files']
        site = ['index', 'install', 'breaks', 'starting-breaks', 'projects', 'presets', 'presets-legacy',
                'manual', 'manual-original', 'manual-legacy', 'manual-projects-guide', 'manual-protocol',
                'builds', 'tools', 'help', 'new', 'remote-identity', 'remote-device']
        offline = ['x0x_installer', 'x0x_breaks', 'x0x_projects']
        names = [('remote', name) for name in remote] + [('site', name) for name in site] + [('offline', name) for name in offline]
        self.assertEqual(captures, [f'{prefix}-{name}-{w}x{h}' for w, h in sizes for prefix, name in names])
        self.assertEqual(events, [event for size in sizes for event in ('launch', size, 'close context', 'close browser')])
        actions = ['#lane-param'] * 6 + [f'[data-view="{view}"]' for view in remote[4:]]
        self.assertEqual(clicks, [(size, action) for size in sizes for action in actions])

    def test_failed_action_identifies_state_and_releases_the_browser(self):
        events, _, _ = self.run_sweep(reject_lane=True)
        self.assertEqual(events, ['launch', (1440, 900), 'close context', 'close browser'])


if __name__ == '__main__':
    unittest.main()
