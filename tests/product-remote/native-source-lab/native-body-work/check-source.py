from pathlib import Path
import hashlib,json,re
r=Path(__file__).resolve().parent;b=(r/'source-ui_drum_voice.inc').read_bytes()
assert hashlib.sha256(b).hexdigest()=='a669c3c03c19204bd26eda0bf59b2f33f43a52da8beb718df8da24ee10b45353'
assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()=='a1e6807eef316e54f82cfc966630290ee2330887'
s=b.decode();source=s[s.index('static const uint16_t DV_XY'):s.index('/* R22 layout')]+s[s.index('static UI_DRAW void dv_body_pictogram'):s.index('/* TUNE fork')]
assert source.encode()==(r/'native-body-source.inc').read_bytes()
xy=[int(x)for x in re.findall(r'\d+',re.search(r'DV_XY\[\] = \{(.*?)\};',s,re.S).group(1))]
poly=[list(map(int,x))for x in re.findall(r'\{(\d+), (\d+)\}',re.search(r'DV_POLY\[\] = \{(.*?)\};',s,re.S).group(1))]
body=[list(map(int,x))for x in re.findall(r'\{(\d+), (\d+)\}',re.search(r'DV_BODY\[2\]\[NDRUM\] = \{(.*?)\};',s,re.S).group(1))]
expected={'source':'2bfae5ef1fce4cb71c7002722c141613e04521de','includeSha256':hashlib.sha256(b).hexdigest(),'xy':xy,'polys':poly,'bodies':[body[:11],body[11:]]}
assert json.loads((r/'body-data.json').read_bytes())==expected
names={str(k):re.findall(r'"([^"]+)"',re.search(r'DV_NAME_'+name+r'\[NDRUM\] = \{(.*?)\};',s,re.S).group(1))for k,name in [(0,'909'),(1,'808')]}
assert json.loads((r/'voice-names.json').read_bytes())==names
print('PASS actual2bfa source blob, extracted function/data and JS table provenance')
