#!/usr/bin/env python3
"""Exercise no-loss dispatch without invoking network or browser commands."""
from pathlib import Path
import os, subprocess, unittest
SCRIPT=Path(__file__).resolve().parents[1]/'scripts/dnbox-gate.sh'
class NoNetwork(unittest.TestCase):
 def run_case(self,value='',kind='commit',contains='0'):
  source=SCRIPT.read_text(); fn=source[source.index('no_loss()'):source.index('limits()')]
  harness='''git() { if [ "$1" = cat-file ]; then printf '%s\\n' "$FAKE_KIND"; elif [ "$1" = diff ]; then return 0; else echo "UNEXPECTED_GIT:$*"; return 99; fi; }
python3() { [ "$1" = tools/dnbox_contains_base.py ] && [ "$2" = "$DNBOX_BASE_SHA" ] && return "$CONTAINS_RC"; }
BASE=not-pinned; LANE=integ
'''+fn+'\nno_loss\n'
  result=subprocess.run(['bash','-uc',harness],env={**os.environ,'DNBOX_BASE_SHA':value,'FAKE_KIND':kind,'CONTAINS_RC':contains},text=True,capture_output=True)
  self.assertNotIn('UNEXPECTED_GIT',result.stdout)
  return result
 def test_missing_fails_closed(self):self.assertNotEqual(self.run_case().returncode,0)
 def test_invalid_fails_closed(self):self.assertNotEqual(self.run_case('main').returncode,0)
 def test_wrong_object_fails_closed(self):self.assertNotEqual(self.run_case('a'*40,'blob').returncode,0)
 def test_exact_commit_passes(self):self.assertEqual(self.run_case('a'*40).returncode,0)
 def test_no_network_git_route(self):
  source=SCRIPT.read_text();self.assertNotRegex(source,r'\bgit\s+(fetch|pull|clone|push)\b')
 def test_containment_failure(self):self.assertNotEqual(self.run_case('a'*40,contains='1').returncode,0)
 def test_failure_overrides_void(self):
  source=SCRIPT.read_text();classification=source[source.index('R=PASS;'):source.index('echo "DNBOX-GATE RESULT')]
  result=subprocess.run(['bash','-c','fail=1;void=1;'+classification+'echo "$R"; [ "$R" = PASS ] && exit 0; [ "$R" = VOID ] && exit 2; exit 1'],text=True,capture_output=True)
  self.assertEqual(result.stdout.strip(),'FAIL');self.assertEqual(result.returncode,1)
 def test_tmpdir_respected(self):self.assertIn('${TMPDIR:-/tmp}',SCRIPT.read_text())
if __name__=='__main__':unittest.main()
