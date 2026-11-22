#!/usr/bin/env python3
"""Exercise the Local gate shell contracts without launching browsers."""
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def stub_run(command, fail):
    prefix = '''
python3() {
 if [ "$1" = tests/browser-sandbox-contract.py ]; then
  echo AUDIT
  return AUDIT_RC
 fi
 echo BROWSER
 return 0
}
npm() { echo BROWSER; return 0; }
rm() { :; }
OUT=unused
'''.replace('AUDIT_RC', '1' if fail else '0')
    return subprocess.run(['bash', '-c', prefix + command], text=True, capture_output=True)


class GateGuard(unittest.TestCase):
    def gate(self):
        source = (ROOT / 'scripts/dnbox-gate.sh').read_text()
        # Current gate uses a single-line function; fail clearly if redesigned.
        function = next(line for line in source.splitlines() if line.startswith('browser()'))
        return function + '\nbrowser\n'

    def test_setup_exports_physical_temp_directory_to_browser_processes(self):
        source = (ROOT / 'scripts/dnbox-gate.sh').read_text()
        export = next(line for line in source.splitlines() if line.startswith('export TMPDIR='))
        setup = source[source.index('setup()'):source.index('fetch_base()')]
        command = '\n'.join([
            'node() { :; }', 'python3() { :; }', export, setup,
            """setup && bash -c 'printf "%s" "$TMPDIR"'""",
        ])
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            (base / 'workspace').mkdir()
            requested = base / 'workspace' / '..' / 'browser downloads'
            result = subprocess.run(
                ['bash', '-c', command], cwd=base, capture_output=True, text=True,
                env={**os.environ, 'DNBOX_GATE_TMPDIR': str(requested)},
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout, str(requested.resolve()))
            self.assertTrue(requested.is_dir())

    def test_gate_stops_before_browser_on_audit_failure(self):
        result = stub_run(self.gate(), True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('AUDIT', result.stdout)
        self.assertNotIn('BROWSER', result.stdout)

    def test_direct_browser_command_stops_on_audit_failure(self):
        command = json.loads((ROOT / 'package.json').read_text())['scripts']['test:browser']
        result = stub_run(command, True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('AUDIT', result.stdout)
        self.assertNotIn('BROWSER', result.stdout)

    def test_gate_reaches_browser_when_audit_passes(self):
        result = stub_run(self.gate(), False)
        self.assertEqual(result.returncode, 0)
        self.assertIn('AUDIT', result.stdout)
        self.assertIn('BROWSER', result.stdout)


class GateArtifactLimits(unittest.TestCase):
    def check_path(self, path):
        source = (ROOT / 'scripts/dnbox-gate.sh').read_text()
        limits = source[source.index('limits()'):source.index('build()')]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)

            def git(*args):
                subprocess.run(['git', '-C', directory, *args], check=True, capture_output=True)

            git('init', '-q')
            git('-c', 'core.hooksPath=/dev/null', '-c', 'user.name=Gate Fixture',
                '-c', 'user.email=gate@example.invalid', 'commit', '-q', '--allow-empty',
                '-m', 'Initialize the Local gate fixture')
            artifact = root / path
            artifact.parent.mkdir(parents=True, exist_ok=True)
            artifact.write_text('test fixture')
            git('add', '--', path)
            return subprocess.run(
                ['bash', '-uo', 'pipefail', '-c',
                 'LANE=fixture; BASE=HEAD; resolve_base() { :; }\n' + limits + '\nlimits'],
                cwd=root, capture_output=True, text=True,
            )

    def test_gate_accepts_fwsc_and_sanitized_evidence(self):
        for path in ['firmware/elite.fwsc', 'firmware/PRO.FWSC', 'evidence/render.png',
                     'evidence/report.txt', 'release/synth.vst3-notes.txt']:
            with self.subTest(path=path):
                result = self.check_path(path)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_gate_rejects_prohibited_artifacts(self):
        for path in ['ctl.img', 'disk.img', 'firmware/ELITE.IMG', 'synth.ipa', 'plugins/synth.component',
                     'plugins/Synth.VST3', 'plugins/Synth.component/Contents/MacOS/Synth',
                     'plugins/Synth.VST3/Contents/Resources/name.txt', 'odd\nname.img']:
            with self.subTest(path=path):
                result = self.check_path(path)
                self.assertEqual(result.returncode, 1, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
