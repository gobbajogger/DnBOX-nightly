# SPDX-License-Identifier: GPL-3.0-only
# Semantic active product exposure, not substring matches in data URIs/code/history.
from html.parser import HTMLParser
from pathlib import Path
import re,unittest
FORBID_SLOT2 = ''.join(map(chr, (0x64, 0x72, 0x6f, 0x6e, 0x65)))
ROOT=Path(__file__).resolve().parents[1]/'web/product-site'
class Exposure(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.stack=[];self.hits=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs);inherited=self.stack[-1][1:]if self.stack else(False,False)
  history=inherited[0]or'data-historical-reference'in a
  skip=inherited[1]or tag in{'script','style','code','pre','template','noscript'}
  if not history and not skip:
   for k in ['aria-label','alt','title']:
    v=a.get(k,'')
    if not v.startswith('data:')and re.search(r'\b'+FORBID_SLOT2+r'\b',v,re.I):self.hits.append((tag,k,v[:100]))
   if tag=='option'and a.get('value','').lower()==FORBID_SLOT2 and a.get('data-retired-engine')!='4':self.hits.append((tag,'active engine choice',a.get('value')))
  if tag not in{'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:self.stack.append((tag,history,skip))
 def handle_startendtag(self,tag,attrs):
  before=len(self.stack);self.handle_starttag(tag,attrs)
  if len(self.stack)>before:self.stack.pop()
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,-1,-1):
   if self.stack[i][0]==tag:del self.stack[i:];break
 def handle_data(self,text):
  historical,skip=self.stack[-1][1:]if self.stack else(False,False)
  if not historical and not skip and re.search(r'\b'+FORBID_SLOT2+r'\b',text,re.I):self.hits.append(('text','active',text.strip()[:100]))
def hits(text):p=Exposure();p.feed(text);return p.hits
class TestExposure(unittest.TestCase):
 def test_real_active_choice_is_rejected(self):
  word=FORBID_SLOT2
  self.assertTrue(hits('<select><option value="'+word+'">'+word.title()+'</option></select>'))
 def test_real_history_and_data_uri_code_are_not_falsely_relabelled(self):
  word=FORBID_SLOT2
  self.assertFalse(hits('<main data-historical-reference="0.0.26">'+word.title()+'</main><style>.'+word+'{}</style><script>"'+word.title()+'"</script><img src="data:image/png;base64,xxx+'+word+'+xxx">'))
 def test_all_public_html_active_text_and_choices(self):
  for path in ROOT.rglob('*.html'):
   if 'remote'in path.relative_to(ROOT).parts:continue
   with self.subTest(path=str(path.relative_to(ROOT))):self.assertEqual(hits(path.read_text()),[])
if __name__=='__main__':unittest.main()
