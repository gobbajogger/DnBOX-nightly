from pathlib import Path
import hashlib,re,json
r=Path(__file__).resolve().parent
paths=[r.parent/'glyph-sweep-work/native/firmware/src/app/ui.c',r.parent/'native-live-tail-work/source/ui.c']
pins=['892773492da1ecd7d2084a0e6ea0ac1d0e9dfbe2d0c4482f9130d0fccb762101','a01c6ffecd57344d34f9b7a52ca3e95487d376b693600ad60532a1977a8741a6']
inputs=[p.read_bytes()for p in paths]
for b,h in zip(inputs,pins):assert hashlib.sha256(b).hexdigest()==h

def extract(s,name):
 matches=list(re.finditer(r'(?m)^[A-Za-z_][^\n;{}]*\b'+name+r'\([^;{}]*\)\s*\{',s));assert len(matches)==1,name
 m=matches[0];start=m.start();i=m.end();depth=1;quote=None
 while depth:
  if quote:
   if s[i]=='\\':i+=2;continue
   if s[i]==quote:quote=None
   i+=1;continue
  if s.startswith('//',i):i=s.index('\n',i);continue
  if s.startswith('/*',i):i=s.index('*/',i)+2;continue
  c=s[i]
  if c in ['"',"'"]:quote=c
  elif c=='{':depth+=1
  elif c=='}':depth-=1
  i+=1
 return s[start:i].encode()
proof={}
for name in ['pref_desc','pref_value_of','matrix_value','drum_strip_role']:
 a,b=[extract(x.decode(),name)for x in inputs];assert a==b,name;proof[name]=hashlib.sha256(a).hexdigest()
print(json.dumps({'source':'af56c8a4ba7b140402db71ba50a4dea6e14fddfe','numericSource':'b341436ff8087c20b8ef51765f986736473611b0','unchangedFunctions':proof,'scope':'UI descriptor/formatter/lookup/role bridge only, not engine admission'}))
