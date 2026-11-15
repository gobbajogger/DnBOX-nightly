// SPDX-License-Identifier: GPL-3.0-only
// Byte-faithful consumer of sample_asset_plan.py f8c7f3399abc1b69830627f636df2bba507b67b8f06ec8c49a226ba322f1e55e.
// No transport, flash writer, audio engine, app-code placement or installation admission.
const HEADER=512,MAGIC=0x504d5346,HASH=/^[a-f0-9]{64}$/;
const fail=(ok,msg)=>{if(!ok)throw new Error(msg);};
const binary=x=>x instanceof Uint8Array && !(typeof SharedArrayBuffer!=='undefined'&&x.buffer instanceof SharedArrayBuffer);
const copy=x=>{fail(binary(x),'exact source bytes required');return Uint8Array.from(x);};
const view=b=>new DataView(b.buffer,b.byteOffset,b.byteLength);
const join=(a,b)=>{const out=new Uint8Array(a.length+b.length);out.set(a);out.set(b,a.length);return out;};
export async function sha(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',copy(bytes)))].map(v=>v.toString(16).padStart(2,'0')).join('');}
const asciiJSON=value=>JSON.stringify(value).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
export function crc32(b){let c=0xffffffff;for(const byte of b){c^=byte;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function zoneValue(zone,data){
 fail(binary(zone)&&zone.length===28&&binary(data),'exact 28-byte source zone and encoded bytes required');
 const v=view(zone),n=v.getUint32(4,true),ls=v.getUint32(8,true),le=v.getUint32(12,true),rate=v.getUint32(16,true),idx=zone[24],lo=zone[25],hi=zone[26],looped=zone[27];
 fail(n>0&&data.length===Math.ceil(n/2)&&rate>0&&rate<=4*65536&&idx<=88&&lo<=hi&&(looped===0||looped===1)&&ls<n&&le<n&&ls<=le,'invalid source zone metadata or span');
 const canonical=copy(zone);view(canonical).setUint32(0,0,true);return {zone:canonical,data:copy(data)};
}
const fingerprint=async(z,d)=>{const c=zoneValue(z,d);return sha(join(c.zone,c.data));};
function freezeCatalog(c){fail(Array.isArray(c),'complete source catalog required');return c.map(r=>{fail(r&&typeof r==='object','source catalog record required');return {id:r.id,group:r.group,zone:copy(r.zone),data:copy(r.data)};});}
export async function catalogDigest(catalog){const frozen=freezeCatalog(catalog),rows=[];for(const r of frozen)rows.push({data_sha256:await sha(r.data),group:r.group,id:r.id,zone_sha256:await sha(r.zone)});return sha(new TextEncoder().encode(asciiJSON(rows)));}
async function validateCatalog(c,expected){
 fail(c.length>0&&c.length<=48,'complete authenticated source catalog required');const ids=new Set(),groups=[],counts=new Map();
 for(const r of c){fail(typeof r.id==='string'&&r.id.length>0&&!ids.has(r.id),'unique asset IDs required');ids.add(r.id);fail(typeof r.group==='string'&&/^[\x20-\x7e]{1,8}$/.test(r.group),'ASCII source group required');if(groups.at(-1)!==r.group){fail(!groups.includes(r.group),'noncanonical repeated source group');groups.push(r.group);}counts.set(r.group,(counts.get(r.group)||0)+1);fail(counts.get(r.group)<=16&&groups.length<=3,'source group count exceeds native layout');zoneValue(r.zone,r.data);}
 fail(typeof expected==='string'&&HASH.test(expected)&&await catalogDigest(c)===expected,'catalog identity changed');
}
export function parseImage(image,capacity){
 fail(Number.isSafeInteger(capacity)&&capacity>=HEADER,'invalid authenticated slot capacity');if(image===null)return [];
 const b=copy(image);fail(b.length>=HEADER&&b.length<=capacity,'existing slot span');const v=view(b),nz=b[6],dlen=v.getUint32(16,true);
 fail(v.getUint32(0,true)===MAGIC&&v.getUint16(4,true)===1&&nz>=1&&nz<=16&&b.length===HEADER+dlen&&crc32(b.subarray(HEADER))===v.getUint32(20,true),'existing slot invalid; never overwrite unknown data');
 const out=[];for(let i=0;i<nz;i++){const z=b.slice(32+28*i,60+28*i),zv=view(z),off=zv.getUint32(0,true),n=zv.getUint32(4,true),length=Math.ceil(n/2);fail(off<=dlen&&length<=dlen-off,'existing zone span');const data=b.slice(HEADER+off,HEADER+off+length);zoneValue(z,data);out.push({zone:z,data});}return out;
}
export function composeGroup(records){
 fail(Array.isArray(records)&&records.length>0&&records.length<=16,'1..16 zones per original group');const name=records[0].group;fail(typeof name==='string'&&/^[\x20-\x7e]{1,8}$/.test(name)&&records.every(r=>r.group===name),'cannot merge different source group namespaces');
 const zones=[],chunks=[];let len=0;for(const r of records){const x=zoneValue(r.zone,r.data);view(x.zone).setUint32(0,len,true);len+=x.data.length;fail(Number.isSafeInteger(len)&&len<=0xffffffff,'data span overflow');zones.push(x.zone);chunks.push(x.data);}
 const b=new Uint8Array(HEADER+len),v=view(b);v.setUint32(0,MAGIC,true);v.setUint16(4,1,true);b[6]=zones.length;b.set(new TextEncoder().encode(name),8);v.setUint32(16,len,true);let off=HEADER;chunks.forEach(c=>{b.set(c,off);off+=c.length;});v.setUint32(20,crc32(b.subarray(HEADER)),true);zones.forEach((z,i)=>b.set(z,32+28*i));return b;
}
export async function planInstall(catalog,expectedDigest,currentImages,capacities,selectedIds=undefined){
 // Snapshot EVERY mutable input before the first await, including explicit selection.
 const c=freezeCatalog(catalog);fail(Array.isArray(currentImages)&&Array.isArray(capacities)&&currentImages.length===capacities.length&&capacities.length>=1&&capacities.length<=3,'complete authenticated slot layout required');
 const images=currentImages.map(b=>b===null?null:copy(b)),caps=[...capacities];
 let ids;if(selectedIds!==undefined){fail(Array.isArray(selectedIds),'explicit selected ID list required');ids=[...selectedIds];}
 const current=images.map((b,i)=>parseImage(b,caps[i]));await validateCatalog(c,expectedDigest);
 const known=c.map(r=>r.id);if(ids===undefined)ids=known;fail(ids.every(i=>typeof i==='string'&&known.includes(i))&&new Set(ids).size===ids.length,'unknown or duplicate selected identity');
 const selected=c.filter(r=>ids.includes(r.id)),available=new Map(),before=[];
 for(const slot of current)for(const z of slot){const f=await fingerprint(z.zone,z.data);before.push(f);available.set(f,(available.get(f)||0)+1);}
 const missing=[];for(const r of selected){const f=await fingerprint(r.zone,r.data),n=available.get(f)||0;if(n)available.set(f,n-1);else missing.push(r);}
 const groups=[];for(const r of missing){if(!groups.length||groups.at(-1)[0].group!==r.group)groups.push([]);groups.at(-1).push(r);}
 let next=current.reduce((last,z,i)=>z.length?i+1:last,0);const writes=[];
 for(const group of groups){const image=composeGroup(group);while(next<caps.length&&image.length>caps[next])next++;fail(next<caps.length,'no safe append capacity; existing samples and ordinals preserved');writes.push({slot_index:next++,image,asset_ids:group.map(r=>r.id)});}
 const proposed=images.map(b=>b===null?null:copy(b));for(const w of writes){fail(proposed[w.slot_index]===null,'occupied slot mutation refused');proposed[w.slot_index]=copy(w.image);}
 const after=[];for(let i=0;i<proposed.length;i++)for(const z of parseImage(proposed[i],caps[i]))after.push(await fingerprint(z.zone,z.data));fail(before.every((f,i)=>after[i]===f),'existing menu ordinals changed');
 return {selected_ids:selected.map(r=>r.id),writes,existing_images_sha256:await Promise.all(images.map(b=>b===null?null:sha(b))),existing_menu_fingerprints:before,proposed_images:proposed,capacity_bytes:caps,device_write_qualified:false};
}
function freezeSnapshot(s){
 fail(s&&Array.isArray(s.images)&&Array.isArray(s.capacities),'complete snapshot required');
 const b=s.binding;fail(b&&typeof b.unitId==='string'&&b.unitId&&typeof b.sessionId==='string'&&b.sessionId&&Number.isSafeInteger(b.epoch)&&b.epoch>=0,'snapshot binding required');
 fail(s.compiledStock?.count===2&&HASH.test(s.compiledStock.sha256),'compiled stock2 identity required');
 return {images:s.images.map(b=>b===null?null:copy(b)),capacities:[...s.capacities],binding:{unitId:b.unitId,sessionId:b.sessionId,epoch:b.epoch},compiledStock:{count:2,sha256:s.compiledStock.sha256},expectedCurrentDigests:Array.isArray(s.expectedCurrentDigests)?[...s.expectedCurrentDigests]:null,expectedSnapshotDigest:s.expectedSnapshotDigest};
}
export async function snapshotDigest(snapshot){const s=freezeSnapshot(snapshot);const hashes=await Promise.all(s.images.map(x=>x===null?null:sha(x)));return sha(new TextEncoder().encode(asciiJSON({binding:s.binding,capacities:s.capacities,compiledStock:s.compiledStock,imageDigests:hashes})));}
async function authenticateSnapshot(s){
 fail(s.images.length===s.capacities.length&&s.images.length>=1&&s.images.length<=3,'complete snapshot layout required');s.images.forEach((b,i)=>parseImage(b,s.capacities[i]));
 const hashes=await Promise.all(s.images.map(x=>x===null?null:sha(x)));fail(s.expectedCurrentDigests?.length===hashes.length&&hashes.every((h,i)=>h===s.expectedCurrentDigests[i]),'snapshot current image digest changed');
 fail(HASH.test(s.expectedSnapshotDigest)&&await snapshotDigest(s)===s.expectedSnapshotDigest,'snapshot identity changed');return s;
}
async function planDigest(p){return sha(new TextEncoder().encode(asciiJSON({selected:p.selected_ids,writes:await Promise.all(p.writes.map(async w=>({slot:w.slot_index,ids:w.asset_ids,sha256:await sha(w.image)}))),proposed:await Promise.all(p.proposed_images.map(b=>b===null?null:sha(b))),existing:p.existing_images_sha256,ordinalPrefix:p.existing_menu_fingerprints,capacity:p.capacity_bytes,stock:p.compiledStockIdentity})));}
export async function createConsumer({catalog,expectedCatalogDigest,snapshot}){
 const c=freezeCatalog(catalog),s=freezeSnapshot(snapshot);await validateCatalog(c,expectedCatalogDigest);await authenticateSnapshot(s);
 let generation=0;const prepared=new WeakMap();const check=(g,signal)=>fail(g===generation&&!signal?.aborted,'cancelled or superseded preparation');
 return Object.freeze({
  cancel(){generation++;},
  async prepare(selectedIds=undefined,{signal}={}){const g=generation;check(g,signal);const p=await planInstall(c,expectedCatalogDigest,s.images,s.capacities,selectedIds);check(g,signal);Object.assign(p,{canInstall:false,deviceWriteQualified:false,eraseUserStorage:false,compiledStockCount:2,compiledStockIdentity:{...s.compiledStock},snapshotDigest:s.expectedSnapshotDigest});const digest=await planDigest(p);check(g,signal);prepared.set(p,{generation:g,digest});return Object.freeze(p);},
  async preflight(plan,currentSnapshot,{signal}={}){const saved=prepared.get(plan);fail(saved,'unknown prepared candidate');check(saved.generation,signal);const latest=freezeSnapshot(currentSnapshot);await authenticateSnapshot(latest);check(saved.generation,signal);fail(latest.expectedSnapshotDigest===s.expectedSnapshotDigest,'stale snapshot/session/layout');fail(await planDigest(plan)===saved.digest,'candidate bytes or identity changed');check(saved.generation,signal);return Object.freeze({status:'EXACT_BYTES_PREFLIGHT_ONLY',candidateDigest:saved.digest,snapshotDigest:s.expectedSnapshotDigest,canInstall:false,deviceWriteQualified:false,requiresTransportReadbackAndPowerSafety:true});}
 });
}

export const CONFIRMED_CONTRACT_SHA256='7c87970ea454e06c935d782cc93ad99b056e5502eb2462ccc2f35d2be0b7c259';
/** Caller supplies trusted catalog/snapshot identities, not assertions taken from the payload itself. */
export async function createConfirmedConsumer(options){
 const cb=copy(options.contractBytes),c=freezeCatalog(options.catalog),s=freezeSnapshot(options.snapshot),digest=options.expectedCatalogDigest;
 fail(await sha(cb)===CONFIRMED_CONTRACT_SHA256,'owner contract identity changed');
 const contract=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(cb));
 const ids=['personal-br1-zone1','personal-br1-zone2','personal-br1-zone3','personal-br2-zone1','personal-br2-zone2'];
 fail(contract.rate===22050&&c.length===5&&contract.assets.length===5,'confirmed five complete source required');
 for(let i=0;i<5;i++){
  const r=c[i],a=contract.assets[i];fail(r.id===ids[i]&&a.id===r.id&&r.group==='BR'+a.original_archive_slot,'confirmed original group/identity changed');
  const z=view(r.zone);fail(z.getUint32(4,true)===a.frames&&z.getUint32(16,true)===32768&&a.sample_rate===22050&&a.channels===1&&a.codec==='IMA_ADPCM4_LOW_NIBBLE_FIRST'&&r.data.length===a.adpcm_bytes&&await sha(r.data)===a.adpcm_sha256,'confirmed encoded rate/frames/hash changed');
 }
 return createConsumer({catalog:c,expectedCatalogDigest:digest,snapshot:s});
}
