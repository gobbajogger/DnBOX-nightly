import unittest,pathlib
from html.parser import HTMLParser
R=pathlib.Path(__file__).parent
class Tree(HTMLParser):
 def __init__(self):super().__init__();self.stack=[];self.ids={}
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id'in a:self.ids[a['id']]=(tag,a,tuple(self.stack))
  if tag not in ['input','meta','link','br','hr','img']:self.stack.append((tag,a))
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,-1,-1):
   if self.stack[i][0]==tag:self.stack=self.stack[:i];break
class Shell(unittest.TestCase):
 def test_original_top_bar_controls_are_visible_not_moved_into_file_drawer(self):
  t=Tree();h=(R/'index.html').read_text();t.feed(h);self.assertNotIn('workspace-file',t.ids)
  for key in ['undo','redo','review','draft-save','draft-file','apply-unavailable']:
   self.assertTrue(any(tag=='header'for tag,a in t.ids[key][2]),key)
  self.assertIn('disabled',t.ids['apply-unavailable'][1]);self.assertEqual(t.ids['draft-file'][1]['type'],'file')
 def test_no_dedicated_note_area_and_label_itself_is_lane_selector(self):
  t=Tree();h=(R/'index.html').read_text();t.feed(h);self.assertNotIn('<aside',h);self.assertNotIn('inspector-toggle',t.ids)
  self.assertEqual(t.ids['lane-kind'][0],'select');self.assertEqual(t.ids['lane-kind'][1]['aria-label'],'Per-note lane parameter')
  self.assertTrue(any(tag=='dialog' and a.get('id')=='note-dialog'for tag,a in t.ids['inspector'][2]))
  self.assertIn('time-ruler',t.ids);self.assertIn('snap',t.ids)
 def test_dedicated_landscape_source_rows_and_controls_not_portrait_squeeze(self):
  s=(R/'style.css').read_text();self.assertIn('@media(orientation:landscape) and (max-height:500px) and (max-width:1000px)',s)
  self.assertIn('grid-template-rows:44px 44px minmax(0,1fr) 20px',s);self.assertIn('grid-template-rows:44px 22px minmax(0,1fr) 54px',s);self.assertIn('#roll-view:not([hidden]),.editor,.roll-stack{display:contents}',s)
  # Arithmetic of declared source rows, not actual browser geometry or touch proof.
  for width,height in [(667,375),(844,390),(932,430)]:self.assertGreaterEqual(height-44-44-20-44-22-54,140)
  self.assertIn('min-height:44px;min-width:44px',s)
 def test_engineering_filler_removed_but_connection_safety_and_accessibility_retained(self):
  h=(R/'index.html').read_text();a=(R/'app.mjs').read_text();self.assertNotIn('Tap the label',h);self.assertNotIn('draft-disclosure',h);self.assertNotIn('Captured format',a);self.assertIn('Example · Not connected',h);self.assertIn('aria-label="Per-note lane parameter"',h);self.assertIn('disabled title="Not connected"',h)
if __name__=='__main__':unittest.main()
