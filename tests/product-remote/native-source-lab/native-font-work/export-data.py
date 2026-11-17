"""Re-export exact licensed generated font data, never runtime captures."""
from pathlib import Path
import hashlib,json,re
root=Path(__file__).resolve().parent
b=(root/'felucca_font.h').read_bytes()
assert hashlib.sha256(b).hexdigest()=='5d895596344a94798b95b86137805bdb685b2e0263f20d2824dea37dbf99e352'
s=b.decode();fonts={}
for name,h,pad,first,last in re.findall(r'static const felucca_font_t FONT_(\w+) = \{ (\d+), (\d+), (\d+), (\d+),',s):
 assert name not in fonts
 f=dict(h=int(h),pad=int(pad),first=int(first),last=int(last))
 for field in ['DATA','ADV','OFF']:
  m=re.search(r'FONT_'+name+'_'+field+r'\[(\d+)\] = \{(.*?)\};',s,re.S)
  values=[int(x,0) for x in re.findall(r'0x[0-9a-f]+|\d+',m.group(2))]
  assert len(values)==int(m.group(1));f[field.lower()]=values
 assert len(f['adv'])==len(f['off'])==f['last']-f['first']+1
 fonts[name]=f
assert list(fonts)==['T','XS','S','B','M','L']
output=(json.dumps({'headerSha256':hashlib.sha256(b).hexdigest(),'fonts':fonts},separators=(',',':'))+'\n').encode()
assert output==(root/'fonts.json').read_bytes(), 'Published source data differs from exact generated header'
print(json.dumps({'fonts':6,'sourceDataSha256':hashlib.sha256(output).hexdigest(),'result':'PASS'}))
