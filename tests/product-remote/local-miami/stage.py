from pathlib import Path
import json,sys,hashlib
# This deliberately stages a separate, disposable fixture, never edits the input site.
import shutil
base, wasm, s = map(lambda arg: Path(arg).resolve(), sys.argv[1:])
if not base.is_dir() or not wasm.is_file() or s.exists() or base in s.parents:
    raise SystemExit('Usage: stage.py BUILT_EXACT_BASE_SITE VERIFIED_LOCAL_WASM NONEXISTENT_OUTPUT')
sha=hashlib.sha256(wasm.read_bytes()).hexdigest()
if sha != 'db1d79bc8bfb5ab3fa9a8fdb78518e42abf99674253b1cb16a602da1e2e28f4e':
    raise SystemExit('Unreviewed local Miami binary')
pins = {
    'remote/app.mjs': 'b87d059d0d471dff81aac4c30f334b2dc3b1e08e',
    'remote/runtime-sound-map.mjs': '511f6ba47a08b2302e4b11d5a7b9c66c01115feb',
    'remote/runtime-sound-state.mjs': 'e4e861796058b812ae6f66327f5a0671613e5e9a',
    'remote/source-sounds.json': 'fcbd6cb6b45c5449be0ff2d3c350790c04966fe9',
}
for name,pin in pins.items():
    data=(base/name).read_bytes()
    if hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest()!=pin:
        raise SystemExit('Unexpected Remote input '+name)
for name,pin in {'emu/native-session.mjs':'077161f1641a927df241112b71bfa46e25023d3808d08469851838dd9c876360','emu/worklet.mjs':'3841c8754053df804e103dc80ea31ab3dc0c4063112aa20b45f3b1421adbd034'}.items():
    if hashlib.sha256((base/name).read_bytes()).hexdigest()!=pin:
        raise SystemExit('Unexpected Runtime input '+name)
def linked(src,dst):
    Path(dst).symlink_to(Path(src).resolve())
shutil.copytree(base,s,copy_function=linked)
for name in ('remote/app.mjs','remote/runtime-sound-state.mjs','emu/runtime.json','emu/native-session.mjs','emu/worklet.mjs'):
    p=s/name
    data=p.read_bytes()
    p.unlink()
    p.write_bytes(data)
(s/'emu/kernel.wasm').unlink()
shutil.copyfile(wasm,s/'emu/kernel.wasm')
fw='bb55c6347628d5b685c81078bba45ba1a1f2207e'
pin=f"const miamiPin=p=>p?.kernel==='{sha}'&&p?.firmware==='{fw}';\n"
p=s/'emu/runtime.json';o=json.loads(p.read_text());o.update(firmware_source=fw,wasm_sha256=sha,wasm_bytes=(s/'emu/kernel.wasm').stat().st_size);p.write_text(json.dumps(o))
p=s/'emu/native-session.mjs';a,b=p.read_text().split('export function createNativeSoundProvider',1)
b=b.replace('pin,voice}',"pin,voice,engine='CHICAGO'}",1).replace(" const firmware=", " const miami=engine==='MIAMI', bank=miami?1:0, count=miami?1:20;\n if(miami?(voice!==0||!miamiPin(pin)):engine!=='CHICAGO')throw Error('Sound role refused');\n const firmware=",1)
b=b.replace("':sound:'+voice+':'","':sound:'+voice+(miami?':miami:':':')").replace('engine,voice:slot,sourceBank','engine:replyEngine,voice:slot,sourceBank').replace("engine!=='CHICAGO'||slot", "replyEngine!==engine||slot").replace('sourceBank!==0','sourceBank!==bank').replace('m.controls.length!==20','m.controls.length!==count').replace('parameter>19','parameter>=count').replace('identity,voice,...fields','identity,voice,...(miami?{engine,sourceBank:1}:{}),...fields')
p.write_text(a+pin+'export function createNativeSoundProvider'+b)
p=s/'emu/worklet.mjs';t=p.read_text();t=t.replace('class NativeKernel',pin+'class NativeKernel')
t=t.replace("const prefix=pin.session+':sound:'+m.voice+':';","const miami=m.engine==='MIAMI';\n  if(miami?(!miamiPin(pin)||m.voice!==0||m.sourceBank!==1):m.engine!==undefined){this.soundError(m,'Wrong native owner');return;}\n  const prefix=pin.session+':sound:'+m.voice+(miami?':miami:':':');")
t=t.replace('request:m.request,op:m.op,voice:m.voice}','request:m.request,op:m.op,voice:m.voice,miami}').replace('parameter>19','parameter>(miami?0:19)')
t=t.replace('  try{\n   if(!m.started){\n    const rc=m.op', '  if(m.miami){this.miamiBoundary(m);return;}\n  try{\n   if(!m.started){\n    const rc=m.op')
insert=""" miamiBoundary(m){
  try{
   const x=this.ex,a=[0,0,1],p=this.controlPin.session+':sound:0:miami:';
   if(!m.started){
    const rc=m.op==='set'?x.web_pilot_miami_set_checked(...a,m.revision,m.expected,m.value):m.op==='undo'?x.web_pilot_miami_undo_checked(...a,m.token):0;
    if(rc!==0)throw Error('Miami transaction refused');m.started=true;
   }
   if(m.op==='set'){const rc=x.web_pilot_miami_confirm();if(rc===0)return;if(rc!==1)throw Error('Miami adoption conflict');}
   const value=x.web_pilot_miami_read_snapshot(...a);if(value<0)throw Error('Miami snapshot unavailable');
   const bytes=new Uint8Array(this.memory.buffer,x.web_pilot_miami_text(),96);
   const dec=(a,b)=>{const q=bytes.slice(a,b),i=q.indexOf(0);if(i<0||q.slice(0,i).some(v=>v<32||v>126))throw Error('Invalid native text');return String.fromCharCode(...q.slice(0,i));};
   const controls=[{target:2,voice:0,parameter:0,value,min:0,max:127,kind:'u32',display:dec(0,64),unit:dec(64,96)}];
   const token=m.op==='set'?x.web_pilot_miami_token():0;
   this.port.postMessage({type:'sound-result',request:m.request,...this.controlPin,engine:'MIAMI',voice:0,sourceBank:1,choiceSerial:x.web_pilot_miami_choice(),revision:p+x.web_pilot_miami_revision(),controls,undoToken:token?p+token:null});
  }catch(e){this.soundError(m,String(e.message??e));}
  this.soundPending=null;
 }
"""
t=t.replace(' process(inputs,outputs){',insert+' process(inputs,outputs){');p.write_text(t)
p=s/'remote/runtime-sound-state.mjs';t=p.read_text().replace('voice,onState',"voice,engine='CHICAGO',onState").replace(" if(![0,1].includes(voice))"," const miami=engine==='MIAMI',bank=miami?1:0,count=miami?1:20;\n if(miami?voice!==0:engine!=='CHICAGO'||![0,1].includes(voice))").replace('g.voice===voice','g.voice===voice&&g.engine===engine').replace('groups.size!==20','groups.size!==count').replace('parameter<20','parameter<count').replace('CHICAGO:${voice}','${engine}:${voice}').replace("g.engine!=='CHICAGO'","g.engine!==engine").replace('g.sourceBank!==0','g.sourceBank!==bank').replace("admitted?'CHICAGO':null","admitted?engine:null").replace('admitted?0:null','admitted?bank:null').replace("reply.engine!=='CHICAGO'","reply.engine!==engine").replace('reply.sourceBank!==0','reply.sourceBank!==bank').replace('reply.controls.length!==20','reply.controls.length!==count');p.write_text(t)
p=s/'remote/app.mjs';t=p.read_text(); t=t.replace("const runtimeSoundBindings=chicagoControlBindings(sourceSounds.entries());",pin+"""const pilotEnabled=location.hostname==='127.0.0.1'&&location.port!=='';
const runtimeSoundBindings=chicagoControlBindings(sourceSounds.entries());
if(pilotEnabled){
 const id='source-sound/MIAMI/0|1:2:0:0:1',r=sourceSounds.entries().find(row=>row.id===id),key='MIAMI:0:2:0:0';
 if(!r||r.target!==2||r.voice!==0||r.parameter!==0||r.sourceBank!==1||r.kind!==1||r.min!==0||r.max!==127||r.enabled!==true)throw Error('Incorrect Miami source carrier');
 const g={key,id,engine:'MIAMI',sourceBank:1,slot:0,target:2,voice:0,parameter:0,kind:'u32',min:0,max:127};
 runtimeSoundBindings.groups.set(key,g);runtimeSoundBindings.byId.set(id,g);
}""")
t=t.replace('const nativeSound=()=>nativeSounds[soundSlot()];',"""let pilotOwner=false;
const pilotState=pilotEnabled?createRuntimeSoundState(runtimeSoundBindings.groups,{voice:0,engine:'MIAMI',onState:()=>{if(pilotOwner&&view==='sound'&&nativeSoundMode)other();}}):null;
const nativeSound=()=>pilotOwner?pilotState:nativeSounds[soundSlot()];""")
t=t.replace('for(const state of nativeSounds)state.close();','pilotOwner=false;pilotState?.close();for(const state of nativeSounds)state.close();')
t=t.replace('await nativeSounds[voice].connect(nativeSoundFactory({...endpoint,voice}));',"pilotOwner=!!(pilotEnabled&&voice===0&&soundBanks[0]==='MIAMI'&&miamiPin(endpoint.pin));await nativeSound().connect(nativeSoundFactory({...endpoint,voice,...(pilotOwner?{engine:'MIAMI'}:{})}));")
t=t.replace("rows=sourceSounds.controls('CHICAGO',slot).filter(c=>soundKey(c.id))","rows=sourceSounds.controls(state.engine,slot).filter(c=>soundKey(c.id))").replace("'<h2>CHICAGO · '+(slot?","'<h2>'+state.engine+' · '+(slot?")
p.write_text(t)
