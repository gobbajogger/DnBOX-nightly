#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Structural schedule tests: no browser and no approvals are implied."""
from pathlib import Path
import tempfile
import unittest

from check_reference_inventory import inventory, visual_inputs

SOURCE = '''
SIZES = [(1440, 900), (1024, 640), (844, 390), (390, 844)]
SITE = ['builds/index.html', 'manual/original/index.html']
OFFLINE = ['x0x_installer.html']
def remote_states():
    def lane(n): pass
    def tab(name): pass
    st = [('sequence', None), ('lane-chance', lane(1)), ('lane-pitch', lane(2)), ('lane-pan', lane(3))]
    for t in ['sound', 'mix', 'patterns', 'files']:
        st.append((t, tab(t)))
    return st
'''

class ReferenceInventory(unittest.TestCase):
    def test_current_schedule_is_read_without_importing_browser(self):
        sites, offline, remote = visual_inputs(SOURCE)
        self.assertEqual(sites, ['builds/index.html', 'manual/original/index.html'])
        self.assertEqual(offline, ['x0x_installer.html'])
        self.assertEqual(remote, ['sequence','lane-chance','lane-pitch','lane-pan','sound','mix','patterns','files'])

    def test_missing_remote_is_explicit_and_not_approval(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            path = root / 'tests/visual'
            path.mkdir(parents=True)
            (path / 'visual_gate.py').write_text(SOURCE)
            snaps = path / '__snapshots__'; snaps.mkdir()
            for name in ['site-builds', 'site-manual-original', 'site-remote-device', 'offline-x0x_installer']:
                for size in ('1440x900','1024x640','844x390','390x844'):
                    (snaps / f'{name}-{size}.png').write_bytes(b'fixture')
            result = inventory(root)
            self.assertEqual(result['expected_count'], 48)
            self.assertEqual(result['registered_count'], 16)
            self.assertEqual(result['remote_missing_count'], 32)
            self.assertFalse(result['complete'])
            self.assertEqual(result['unexpected'], [])
            (snaps / 'unknown.png').write_bytes(b'fixture')
            self.assertEqual(inventory(root)['unexpected'], ['unknown.png'])

    def test_changed_viewports_fail_closed(self):
        with self.assertRaisesRegex(ValueError, 'viewport schedule changed'):
            visual_inputs(SOURCE.replace('(390, 844)', '(391, 844)'))

if __name__ == '__main__':
    unittest.main()
