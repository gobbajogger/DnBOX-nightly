"""Static source closure, including legacy tool pages; not HTTP/browser acceptance."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import hashlib,json,unittest
ROOT=Path(__file__).resolve().parents[1]/'web/product-site'
class Links(HTMLParser):
 def __init__(self):super().__init__();self.refs=[]
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if tag in('a','img','script','link','use','source','iframe'):
   for key in('href','src'):
    if key in d:self.refs.append(d[key])
class ProductClosure(unittest.TestCase):
 def test_every_local_html_target_including_installer_samples_projects_exists(self):
  checks=0
  for page in ROOT.rglob('*.html'):
   links=Links();links.feed(page.read_text())
   for ref in links.refs:
    url=urlsplit(ref)
    if url.scheme or url.netloc:continue
    path=unquote(url.path);target=(ROOT/path.lstrip('/'))if path.startswith('/')else(page.parent/path if path else page)
    if target.is_dir()or path.endswith('/'):target=target/'index.html'
    self.assertTrue(target.resolve().is_relative_to(ROOT.resolve()),f'{page.relative_to(ROOT)} escapes: {ref}');self.assertTrue(target.exists(),f'{page.relative_to(ROOT)} missing: {ref}');checks+=1
  self.assertGreater(checks,380)
 def test_six_restored_original_asset_bytes_and_git_objects_are_exact(self):
  m=json.loads((Path(__file__).parent/'product-original-assets.json').read_text());self.assertEqual(len(m['files']),6)
  for row in m['files']:
   data=(ROOT/row['path']).read_bytes();self.assertEqual(len(data),row['bytes']);self.assertEqual(hashlib.sha256(data).hexdigest(),row['sha256']);self.assertEqual(hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest(),row['git_blob'])
 def test_r22_study_does_not_remove_historical_reference_or_claim_installed_firmware(self):
  self.assertEqual(hashlib.sha256((ROOT/'reference/r22-source.html').read_bytes()).hexdigest(),'722d701c4404f57e3ef3d5e5cd79c6c41bd78abb426cb85ec8758b0bb1402986');self.assertTrue((ROOT/'reference/current-ui.html').is_file());self.assertIn('not installed firmware',(ROOT/'reference/index.html').read_text());self.assertIn('reference/index.html',(ROOT/'index.html').read_text())
if __name__=='__main__':unittest.main()
