import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {createInterface} from 'node:readline';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {mountFirmwareLink} from '../../web/product-site/remote/firmware-link.mjs';
import {OP,encodeCommand,decodeReply} from '../../web/product-site/remote/device/vendor/codec.mjs';

const dir=fileURLToPath(new URL('./tests/',import.meta.url));
const binary=join(mkdtempSync(join(tmpdir(),'dnr2-remote-')),'fixture');
const coreSha='4f7fae3087e3477d8bf8a65f77c3189dddddd3e1d34b8c264b3b1017578f97d4';
const wireSha='81b4a8729cab7af75bb8495f528d9979d0fc02abbedfba05aaac3f0dae659390';
for(const [name,sha] of [['remote_core.c',coreSha],['remote_wire.c',wireSha]])assert.equal(createHash('sha256').update(readFileSync(join(dir,'c-reference',name))).digest('hex'),sha);
execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-O2','c_fixture.c','c-reference/remote_core.c','c-reference/remote_wire.c','-o',binary],{cwd:dir});

function host(){
 const child=spawn(binary,[],{stdio:['pipe','pipe','pipe']}),lines=createInterface({input:child.stdout});
 let queue=[];
 lines.on('line',line=>{const parsed=JSON.parse(line);queue.shift()?.(parsed);});
 return {send(line){return new Promise(resolve=>{queue.push(resolve);child.stdin.write(line+'\n');});},close(){child.stdin.end();lines.close();child.kill();}};
}
function bundle(controls){
 return {catalog:{crc:0x12345678,count:controls.length,admitted:true,controls},admission:{catalogCrc:0x12345678,sourceSha:coreSha,reviewSha:wireSha,testOnly:true}};
}
const controls=[{id:1,kind:1,min:0,max:1000,label:'Scalar'},{id:2,kind:2,min:-1000,max:1000,label:'Level'},{id:37,kind:3,min:1,max:127,readMin:0,readMax:2,label:'Hold'}];

class El{
 constructor(tag){this.tag=tag;this.dataset={};this.children=[];this.listeners={};this.textContent='';this.value='';this.disabled=false;this._id='';}
 get id(){return this._id;}
 set id(value){this._id=value;this.owner.nodes.set(value,this);}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 append(child){child.owner=this.owner;if(child._id)this.owner.nodes.set(child._id,child);this.children.push(child);}
 replaceChildren(){this.children.length=0;}
 click(){return Promise.all((this.listeners.click??[]).map(fn=>fn({preventDefault(){}})));}
 fire(type){for(const fn of this.listeners[type]??[])fn();}
}
function dom(){
 const nodes=new Map();
 const document={createElement(tag){const el=new El(tag);el.owner={nodes};return el;},getElementById(id){return nodes.get(id)??null;}};
 for(const id of ['connect','apply','conn-state','firmware-safety','firmware-controls']){const el=new El('node');el.owner={nodes};el.id=id;el.textContent=id==='connect'?'Connect':'';}
 return {document,nodes};
}
function midi(fixture,ops,replies){
 const input={state:'connected',type:'input',listeners:[],addEventListener(type,fn){if(type==='midimessage')this.listeners.push(fn);},removeEventListener(type,fn){this.listeners=this.listeners.filter(item=>item!==fn);},open:async()=>{},close:async()=>{},deliver(data){for(const fn of this.listeners)fn({data});}};
 const output={state:'connected',type:'output',open:async()=>{},close:async()=>{},send(bytes){const command=decodeCommand(bytes);ops.push(command.op);fixture.send(Buffer.from(bytes).toString('hex')).then(reply=>{if(!reply.hex)return;const raw=Buffer.from(reply.hex,'hex');replies.push(decodeReply(raw));input.deliver(raw);}).catch(()=>{});}};
 return {access:{inputs:new Map([['in',input]]),outputs:new Map([['out',output]])},input,output};
}
async function until(read,label){const start=Date.now();let value;while(Date.now()-start<3000){value=read();if(value)return value;await new Promise(resolve=>setTimeout(resolve,10));}throw Error(`${label}: ${value}`);}

test('a page with no reviewed catalog sends nothing and leaves Apply disabled',async()=>{const {document,nodes}=dom();let calls=0;mountFirmwareLink({document,navigator:{requestMIDIAccess(){calls++;throw Error('should not be called');}},bundle:null});assert.equal(nodes.get('firmware-safety').textContent,'No reviewed firmware catalog. Apply stays off.');await nodes.get('connect').click();assert.equal(calls,0);assert.match(nodes.get('conn-state').textContent,/Apply stays off/);assert.equal(nodes.get('apply').disabled,true);});

test('the C fixture handshake reads confirmed values and Apply is the only write',async()=>{
 const fixture=host(),ops=[],replies=[];const {document,nodes}=dom();const ports=midi(fixture,ops,replies);
 mountFirmwareLink({document,navigator:{requestMIDIAccess:async()=>ports.access},bundle:bundle(controls)});
 try{
  await nodes.get('connect').click();
  await until(()=>nodes.get('conn-state').textContent.startsWith('Connected'),'connect');
  assert.equal(nodes.get('fw-1').value,'500');
  assert.equal(nodes.get('fw-2').value,'128.5');
  assert.match([...nodes.get('firmware-controls').children].at(-1).textContent,/Hold 0/);
  assert.equal(ops.includes(OP.SET),false);
  assert.equal(nodes.get('apply').disabled,true);
  nodes.get('fw-1').value='800';nodes.get('fw-1').fire('input');
  assert.equal(nodes.get('apply').disabled,false);
  assert.equal(ops.includes(OP.SET),false);
  await nodes.get('apply').click();
  await until(()=>nodes.get('conn-state').textContent==='Firmware confirmed 800.','ack');
  assert.equal(ops.filter(op=>op===OP.SET).length,1);
  await fixture.send('change');
  nodes.get('fw-1').value='700';nodes.get('fw-1').fire('input');
  await nodes.get('apply').click();
  await until(()=>nodes.get('conn-state').textContent.includes('instrument changed'),'conflict');
  const open=replies.find(reply=>reply.op===OP.OPEN);
  const readback=decodeReply(Buffer.from((await fixture.send(Buffer.from(encodeCommand({version:2,op:OP.READ,unit:open.unit,unitHigh:open.unitHigh,client:91,epoch:open.epoch,request:900,revision:0,control:1,token:0,value:0})).toString('hex'))).hex,'hex'));
  assert.equal(readback.value,800);
  assert.equal(replies.filter(reply=>reply.op===OP.SET).at(-1).status,5);
  await nodes.get('connect').click();
  await until(()=>nodes.get('conn-state').textContent==='Disconnected','disconnect');
  const closed=JSON.parse(JSON.stringify(await fixture.send('tick 0')));
  assert.equal(closed.active,0);
 }finally{fixture.close();}
});

test('an unsupported C control stays unconfirmed and cannot be applied',async()=>{
 const fixture=host(),ops=[],replies=[];const {document,nodes}=dom();
 const inactive=bundle([controls[0],{id:99,kind:1,min:0,max:127,label:'Missing'},controls[2]]);
 mountFirmwareLink({document,navigator:{requestMIDIAccess:async()=>midi(fixture,ops,replies).access},bundle:inactive});
 try{
  await nodes.get('connect').click();
  await until(()=>nodes.get('conn-state').textContent.startsWith('Connected'),'connect');
  assert.match(nodes.get('firmware-controls').children[1].textContent,/Not confirmed/);
  assert.equal(nodes.get('fw-99'),undefined);
  assert.equal(nodes.get('apply').disabled,true);
  assert.equal(ops.includes(OP.SET),false);
 }finally{fixture.close();}
});
