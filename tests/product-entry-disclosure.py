import unittest
from pathlib import Path
B=Path(__file__).resolve().parents[1]/'web/product-site'
class EntryDisclosure(unittest.TestCase):
 def test_remote_preview_and_unavailable_export_disclosed_before_file_or_connection(self):
  out=B;home=(out/'index.html').read_text();tools=(out/'tools/index.html').read_text();project=(out/'projects/index.html').read_text();starting=(out/'starting-breaks/index.html').read_text()
  self.assertIn('Local workspace preview',home);self.assertNotIn('Connect your browser to the instrument.',home)
  self.assertIn('on a connected DnBOX over USB or Bluetooth MIDI. Needs firmware with Remote control.',tools)
  self.assertNotIn('keep working in Draft',tools);self.assertNotIn('Start emulator',tools)
  self.assertNotIn('No connected control or playback in this preview.',tools)
  self.assertIn('Browser MIDI export is unavailable',project);self.assertIn('You can still check a project file or back up and restore full projects.',project);self.assertIn('A Remote draft is not a project file and cannot be exported as MIDI.',project);self.assertNotIn('source-executed browser provider',project)
  self.assertIn('Download chosen breaks',starting)
  self.assertIn('Downloading does not change your keyboard',starting)
  self.assertIn('Restore replaces slot 1, and slot 2',starting)
  self.assertIn('It does not add to occupied slots',starting)
  self.assertIn('export const provider=null;',(out/'projects/exchange/provider.mjs').read_text());self.assertIn('null',(out/'remote/device/catalog.mjs').read_text())

if __name__=='__main__':unittest.main()

