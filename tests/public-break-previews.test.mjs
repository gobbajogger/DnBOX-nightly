import test,{before,after}from'node:test';
import assert from'node:assert/strict';
import http from'node:http';
import {readFile}from'node:fs/promises';
import {fileURLToPath}from'node:url';
import {createHash}from'node:crypto';
import vm from'node:vm';
import {createPicker}from'../web/product-site/components/break-picker/picker.mjs';
import {createAudition}from'../web/product-site/components/break-audition/audition.mjs';
import {SAMPLE_CONTRACT_SHA256}from'../web/product-site/sample-pin.mjs';
const IDS=['personal-br1-zone1','personal-br1-zone2','personal-br1-zone3','personal-br2-zone1','personal-br2-zone2'];
const root=new URL('../web/product-site/',import.meta.url);
let origin,server,provider,corrupt=false,redirect=false;
const requests=[];
before(async()=>{
 server=http.createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  const id=IDS.find(id=>path==='/web/product-site/assets/stock-breaks/'+id+'.wav');
  const record={path,status:id?200:404,privateHeader:req.headers['x-dnbox-private']??null};requests.push(record);
  if(!id){res.writeHead(404);res.end('not found');return;}
  if(redirect){record.status=302;res.writeHead(302,{Location:'/outside-preview'});res.end();return;}
  let b=await readFile(new URL('./assets/stock-breaks/'+id+'.wav',root));
  if(corrupt){b=Buffer.from(b);b[44]^=1;}
  res.writeHead(200,{'content-type':'audio/wav'});res.end(b);
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
 if(process.env.R046_VARIANT==='old'){
  const source=await readFile(new URL('../originals/install.3f22.mjs',import.meta.url),'utf8');
  const blob=createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex');
  assert.equal(blob,'32dd9b6d645fce3904f41cd5bd798c2e402015f5');
  const resolveExpression=source.split('\n').find(s=>s.trim().startsWith('resolvePrivateUrl:')).trim().replace(/^resolvePrivateUrl:/,'').replace(/,$/,'');
  const fetchExpression=source.split('\n').find(s=>s.trim().startsWith('fetchBytes:')).trim().replace(/^fetchBytes:/,'').replace(/,$/,'');
  const context={encodeURIComponent,Uint8Array,Error,fetch:(url,options)=>fetch(new URL(url,origin),options)};
  provider={resolvePrivateUrl:vm.runInNewContext('('+resolveExpression+')',context),fetchBytes:vm.runInNewContext('('+fetchExpression+')',context)};
 }else{
  const {createPublicBreakPreviews}=await import('../web/product-site/public-break-previews.mjs');
  provider=createPublicBreakPreviews(origin+'/web/product-site/public-break-previews.mjs');
 }
});
after(async()=>{if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}console.log('HTTP_REQUEST_RECEIPT '+JSON.stringify(requests));});
async function picker(){return createPicker(new Uint8Array(await readFile(new URL('sample-contract.json',root))),SAMPLE_CONTRACT_SHA256);}
test('all five exact previews are publicly fetchable without changing default choices',async()=>{
 const p=await picker();assert.deepEqual(p.selectedIds(),IDS);const failures=[];
 for(const id of IDS){try{const preview=await p.preview(id,provider);assert.equal(preview.sampleRate,22050);assert.equal(preview.playbackRate,1);}catch(e){failures.push({id,error:e.message});}}
 assert.deepEqual(failures,[]);assert.deepEqual(p.selectedIds(),IDS);assert.equal(p.summary().eraseUserStorage,false);
});
test('public fetch sends no private authentication header',async()=>{
 const p=await picker();await p.preview(IDS[0],provider);assert.ok(requests.length>0);assert.equal(requests.at(-1).privateHeader,null);
});
test('unknown ID and arbitrary URL fail closed before any HTTP request',async()=>{
 const n=requests.length;assert.throws(()=>provider.resolvePrivateUrl('../outside'));assert.throws(()=>provider.resolvePrivateUrl('toString'));await assert.rejects(()=>provider.fetchBytes(origin+'/private-audio/'+IDS[0]));assert.equal(requests.length,n);
});
test('subsets, None and audition preserve independent selection and no-erase semantics',async()=>{
 const p=await picker();p.select([IDS[1],IDS[3]]);await p.preview(IDS[0],provider);assert.deepEqual(p.selectedIds(),[IDS[1],IDS[3]]);
 p.none();await p.preview(IDS[4],provider);assert.deepEqual(p.selectedIds(),[]);assert.equal(p.summary().action,'leave-base-unchanged');assert.equal(p.summary().eraseUserStorage,false);p.all();assert.deepEqual(p.selectedIds(),IDS);
});
test('same-length corrupt WAV is rejected by unchanged picker hash check',async()=>{
 const p=await picker();corrupt=true;try{await assert.rejects(()=>p.preview(IDS[0],provider),/hash\/size mismatch/);}finally{corrupt=false;}
});
test('HTTP redirect cannot escape the public preview whitelist',async()=>{
 redirect=true;try{await assert.rejects(()=>provider.fetchBytes(provider.resolvePrivateUrl(IDS[0])));}finally{redirect=false;}
});
test('real audition consumer fetches a public WAV without selecting it; media interface is a stub, not browser audio proof',async()=>{
 const p=await picker();p.none();let paused=0;
 const audio={addEventListener(){},removeEventListener(){},pause(){paused++;},removeAttribute(){},load(){},async play(){}};
 const a=createAudition(p,{...provider,createAudio:()=>audio,createUrl:()=> 'blob:test-only',revokeUrl(){}});
 assert.equal(await a.play(IDS[2]),true);assert.equal(a.state().id,IDS[2]);assert.deepEqual(p.selectedIds(),[]);assert.equal(audio.playbackRate,1);a.stop();assert.equal(a.state().status,'idle');assert.equal(paused,1);a.destroy();
});


test('installer entry wires the public provider without changing the prepared-choice admission seam',async()=>{
 const s=await readFile(new URL('../web/product-site/install.mjs',import.meta.url),'utf8');
 assert.match(s,/import \{createPublicBreakPreviews\} from '\.\/public-break-previews\.mjs'/);
 assert.match(s,/const previewSource=createPublicBreakPreviews\(import\.meta\.url\)/);
 assert.match(s,/resolvePrivateUrl:previewSource\.resolvePrivateUrl/);
 assert.match(s,/fetchBytes:previewSource\.fetchBytes/);
 assert.match(s,/initialSelectedIds:savedSelection/);
 assert.doesNotMatch(s,/X-Dnbox-Private|\/private-audio\//);
 assert.doesNotMatch(s,/acquireContext:/);
});
