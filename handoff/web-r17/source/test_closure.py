import unittest,json,hashlib,pathlib,re,xml.etree.ElementTree as E
R=pathlib.Path(__file__).parent
class Closure(unittest.TestCase):
 def test_inputs(self):
  for p in json.loads((R/'SOURCE-PINS.json').read_text())['inputs']:
   if p['path']=='glyphs.json':continue
   self.assertEqual(hashlib.sha256((R/p['path']).read_bytes()).hexdigest(),p['sha256'])
 def test_semantic_exact(self):
  src=R.parent/'semantic-components-r22-v1/output';index=json.loads((src/'index.json').read_text());data=json.loads((R/'components.json').read_text());self.assertEqual(data['source_freeze_sha256'],'dc0f8a080843b427cda17e6c55e80043aef40788e5d711e7c6f13382c5c966ff');self.assertEqual(len(data['screens']),26)
  for screen in data['screens']:
   row=next(x for x in index['entries']if x['path']==screen['path']);original=json.loads((src/row['file']).read_text());original.pop('header_svg')
   for control in original['controls']:control.pop('svg')
   self.assertEqual(screen['body_svg'].count('viewBox="0 20 240 220"'),1);restored=dict(screen);restored['body_svg']=screen['body_svg'].replace('viewBox="0 20 240 220"','viewBox="3 23 234 201"',1);self.assertEqual(restored,original);self.assertFalse(screen['runtime_admitted']);root=E.fromstring(screen['body_svg']);self.assertFalse(any(n.tag.rsplit('}',1)[-1]in('script','image','foreignObject','use')for n in root.iter()))
 def test_module_closure(self):
  for p in R.glob('*.mjs'):
   for link in re.findall(r"from\s*['\"](\.[^'\"]+)['\"]",p.read_text()):self.assertTrue((p.parent/link).exists(),link)
 def test_shell_boundary(self):
  h=(R/'index.html').read_text();a=(R/'app.mjs').read_text();s=(R/'style.css').read_text()
  self.assertIn('disabled title="Not connected"',h);self.assertNotIn('requestMIDIAccess',a);self.assertNotIn('WebSocket',a);self.assertIn('100dvh',s);self.assertIn('overflow:hidden',s);self.assertIn('overflow:auto',s);self.assertIn('pointercancel',(R/'workspace.mjs').read_text());self.assertIn('lostpointercapture',(R/'workspace.mjs').read_text());self.assertIn('prefers-reduced-motion',s)
if __name__=='__main__':unittest.main()
