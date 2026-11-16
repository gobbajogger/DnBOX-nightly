"""Source-only launch safety contract. Never launches Chromium or opens sockets."""
import ast,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parent

def violations(source):
 errors=[]
 for n in ast.walk(ast.parse(source)):
  if not(isinstance(n,ast.Call)and isinstance(n.func,ast.Attribute)and n.func.attr=='launch'and isinstance(n.func.value,ast.Attribute)and n.func.value.attr=='chromium'):continue
  kw={x.arg:x.value for x in n.keywords};enabled=kw.get('chromium_sandbox')
  if not(isinstance(enabled,ast.Constant)and enabled.value is True):errors.append('normal Chromium sandbox must be explicitly enabled')
  args=ast.literal_eval(kw['args'])if'args'in kw else[]
  if any(x in args for x in ['--no-sandbox','--disable-setuid-sandbox']):errors.append('sandbox-disabling flags forbidden')
 return errors

class BrowserLaunchContract(unittest.TestCase):
 def test_main_runner_uses_normal_sandbox_without_attempting_launch(self):self.assertEqual(violations((ROOT/'product-site-browser.py').read_text()),[])
 def test_animation_runner_uses_normal_sandbox_without_attempting_launch(self):self.assertEqual(violations((ROOT/'product-site-animation-browser.py').read_text()),[])
 def test_runners_honor_gate_browser_without_disabling_sandbox(self):
  for name in ['product-site-browser.py','product-site-animation-browser.py']:
   source=(ROOT/name).read_text()
   self.assertIn("os.environ.get('CHROMIUM_EXECUTABLE'",source,name)
   self.assertEqual(violations(source),[])
 def test_actual_old_public_launch_lines_are_rejected(self):
  m=json.loads((ROOT/'fixtures/site-browser-sandbox-before.json').read_text());self.assertEqual(len(m['rows']),2)
  for row in m['rows']:
   self.assertEqual(len(row['sourceGitBlob']),40);self.assertEqual(len(row['sourceSHA256']),64);self.assertIn('sandbox-disabling flags forbidden',violations(row['launchSource']))
if __name__=='__main__':unittest.main()
