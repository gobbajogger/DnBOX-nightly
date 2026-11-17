from pathlib import Path
import unittest,json,hashlib
P=Path(__file__).resolve().parents[1]/'web/product-site'
class HiHatProduct(unittest.TestCase):
 def test_every_source_fragment_and_exact_inverse_predecessor(self):
  after=(P/'index.html').read_text();receipt=json.loads((P/'HIHAT-SOURCE-PATCH.json').read_text());self.assertEqual(receipt['sharedSHA256'],'2d234b1ee918ae9b882800256ed3867757a64304ade44d0a352f3f50f6ccc4cd');self.assertEqual(len(receipt['replacements']),14);before=after
  entry=json.loads((P/'ENTRY-DISCLOSURE.json').read_text());row=next(r for r in entry['files'] if r['path']=='index.html')
  for c in reversed(row['changes']):before=before.replace(c['after'],c['before'],1)
  hihat_stage=before
  for e in reversed(receipt['replacements']):self.assertIn(e['after'],before);before=before.replace(e['after'],e['before'],1)
  self.assertEqual(hashlib.sha256(before.encode()).hexdigest(),'a75ce592306d0739c1dea0e9e2555e4fdf842c23fed8b1878a205d02659e46dd');self.assertEqual(hashlib.sha256(hihat_stage.encode()).hexdigest(),receipt['afterSHA256']);self.assertEqual(after.count('data-hihat-part="paired-cymbals"'),14);self.assertEqual(after.count('data-hihat-part="pull-rod-clutch"'),14);self.assertEqual(after.count('data-hihat-part="lower-support"'),14)
 def test_lineage_marks_baseline_and_exact_shared_override_not_whole_site_adoption(self):
  p=json.loads((P/'APPROVED-PRESENTATION.json').read_text());self.assertIn('baseline_shared_website_instrument_paths_sha256',p);self.assertEqual(p['R22HiHat']['occurrences'],14);self.assertIn('still open',p['appearance']);self.assertEqual(json.loads((P/'SOURCE-TRACE.json').read_text())['R22HiHat'],p['R22HiHat'])
if __name__=='__main__':unittest.main()
