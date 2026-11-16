"""Optional source provenance replay: pass a checkout of the pinned firmware source."""
from pathlib import Path
import hashlib,json,os,subprocess,sys,tempfile
root=Path(__file__).resolve().parent; native=Path(sys.argv[1]).resolve()
receipt=json.loads((root/'regeneration.json').read_bytes())
captured={p:(native/p).read_bytes() for p in receipt['inputHashes']}
for p,b in captured.items():assert hashlib.sha256(b).hexdigest()==receipt['inputHashes'][p],p
with tempfile.TemporaryDirectory(prefix='dnbox-font-provenance-') as td:
 stage=Path(td)
 for p,b in captured.items():q=stage/p;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(b)
 def verify():
  for p,b in captured.items():assert (stage/p).read_bytes()==b,p
 verify()
 run=subprocess.run([sys.executable,str(stage/'tools/gen_font.py'),str(stage/'font.h')],env={**os.environ,'X0X_FONTSET':'barlow','X0X_FONT_DIRS':''},capture_output=True,text=True,timeout=60)
 assert run.returncode==0,run.stderr
 verify();actual=hashlib.sha256((stage/'font.h').read_bytes()).hexdigest()
 assert actual==receipt['expectedHeader']==receipt['generatedHeader']
 print(json.dumps({'result':'PASS','generatedHeader':actual,'capturedInputs':len(captured),'stdout':run.stdout}))
