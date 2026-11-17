import unittest,json,hashlib
from pathlib import Path
B=Path(__file__).resolve().parents[1]/'web/product-site'
class EntryDisclosure(unittest.TestCase):
 def test_remote_preview_and_unavailable_export_disclosed_before_file_or_connection(self):
  out=B;home=(out/'index.html').read_text();tools=(out/'tools/index.html').read_text();project=(out/'projects/index.html').read_text();starting=(out/'starting-breaks/index.html').read_text()
  self.assertIn('Local workspace preview',home);self.assertNotIn('Connect your browser to the instrument.',home)
  self.assertIn('No connected control or playback in this preview.',tools);self.assertIn('Draft download/open',tools)
  self.assertIn('Browser MIDI export is unavailable',project);self.assertIn('source-executed browser provider',project)
  self.assertIn('Starting-break choices are a separate preparation preview',starting)
  self.assertIn('export const provider=null;',(out/'projects/exchange/provider.mjs').read_text());self.assertIn('null',(out/'remote/device/catalog.mjs').read_text())
 def test_entry_copy_is_exact_reversible_and_does_not_remove_any_tool_script(self):
  out=B;proof=json.loads((out/'ENTRY-DISCLOSURE.json').read_text())
  self.assertEqual(len(proof['files']),4)
  for row in proof['files']:
   text=(out/row['path']).read_text();self.assertEqual(hashlib.sha256(text.encode()).hexdigest(),row['afterSHA256'])
   for change in reversed(row['changes']):self.assertEqual(text.count(change['after']),1);text=text.replace(change['after'],change['before'],1)
   self.assertEqual(hashlib.sha256(text.encode()).hexdigest(),row['beforeSHA256'])


if __name__=='__main__':unittest.main()
