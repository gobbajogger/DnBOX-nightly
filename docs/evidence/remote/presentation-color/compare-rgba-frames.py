from pathlib import Path
import base64,hashlib,io,json,subprocess,sys,tempfile
from PIL import Image
root=Path(sys.argv[1])
manifest=json.loads((root/'SOURCE-SNAPSHOT.json').read_bytes());captured={p:(root/p).read_bytes()for p in manifest}
for p,b in captured.items():assert hashlib.sha256(b).hexdigest()==manifest[p]
receipt=json.loads(captured['native-body-work/idle-frame-comparison.json'])
images={}
for row in receipt['frames']:
 b=(Path(sys.argv[2])/(row['frame']+'.png')).read_bytes();assert hashlib.sha256(b).hexdigest()==row['pngSha256'];images[row['frame']]=Image.open(io.BytesIO(b)).convert('RGBA')
with tempfile.TemporaryDirectory(prefix='dnbox-panels-')as td:
 stage=Path(td)
 for p,b in captured.items():q=stage/p;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(b)
 code="""import{nativeRgba}from'./native-color-work/rgba.mjs';import{drumIdleFrame}from'./native-body-work/idle-frame.mjs';import inputs from'./native-body-work/factory-patterns.json'with{type:'json'};for(const[name,context]of Object.entries(inputs.frames)){const[,kit,voice,page]=name.match(/kit(\\d)-voice(\\d+)-page(\\d+)/).map(Number);const header={palette:1,light:false,playing:false,recording:false,saveState:'saved',pendingCue:false,battery:3,tempo:125};console.log(JSON.stringify({name,end:240,rgba:Buffer.from(nativeRgba(drumIdleFrame(kit,voice,page,{...context,header}).pixels)).toString('base64')}));}"""
 run=subprocess.run(['node','--input-type=module','-'],input=code,cwd=stage,text=True,capture_output=True,timeout=30);assert run.returncode==0,run.stderr
 for p,b in captured.items():assert (stage/p).read_bytes()==b
 total=0;seen=set()
 for line in run.stdout.splitlines():
  d=json.loads(line);name=d['name'];assert name not in seen;seen.add(name);im=images[name];assert im.size==(240,240);actual=base64.b64decode(d['rgba']);assert len(actual)==240*240*4;assert actual==im.tobytes(),name;total+=240*240
 assert len(seen)==45 and total==2592000
 print(json.dumps({'frames':45,'rgbaPixels':total,'differences':0,'result':'PASS','scope':'45 full source-generated RGBA frames versus native PNG; factory dark amber idle saved only; not current/live/theme/app qualification'}))
