// SPDX-License-Identifier: GPL-3.0-only
// Standard stored ZIP for sequence exchange, not the DNPR-only ZIP format or project backup.
const encoder=new TextEncoder();
function crc32(b){let c=0xffffffff;for(const v of b){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0;}
export function storeZip(files){
 if(!Array.isArray(files)||!files.length||files.length>128)throw Error('Bounded exchange files required');const seen=new Set(),rows=[];let payload=0,offset=0,centralLength=0;
 for(const file of files){const name=file?.name;if(typeof name!=='string'||!name||/[\\:\x00-\x1f\x7f]/.test(name)||name.startsWith('/')||name.split('/').some(x=>!x||x==='.'||x==='..'||/[. ]$/.test(x)))throw Error('Invalid archive path');const key=name.toLowerCase();if(seen.has(key))throw Error('Duplicate archive path');seen.add(key);const n=encoder.encode(name);if(n.length>255)throw Error('Archive name too long');if(!(file.bytes instanceof Uint8Array)||(typeof SharedArrayBuffer!=='undefined'&&file.bytes.buffer instanceof SharedArrayBuffer))throw Error('Exact file bytes required');const b=Uint8Array.from(file.bytes);payload+=b.length;if(payload>32*1024*1024)throw Error('Exchange bundle exceeds32MiB');rows.push({name:n,bytes:b,crc:crc32(b),offset});offset+=30+n.length+b.length;centralLength+=46+n.length;}
 const out=new Uint8Array(offset+centralLength+22),v=new DataView(out.buffer);let at=0;
 for(const r of rows){v.setUint32(at,0x04034b50,true);v.setUint16(at+4,20,true);v.setUint16(at+6,0x800,true);v.setUint16(at+12,0x21,true);v.setUint32(at+14,r.crc,true);v.setUint32(at+18,r.bytes.length,true);v.setUint32(at+22,r.bytes.length,true);v.setUint16(at+26,r.name.length,true);out.set(r.name,at+30);out.set(r.bytes,at+30+r.name.length);at+=30+r.name.length+r.bytes.length;}
 const centralStart=at;for(const r of rows){v.setUint32(at,0x02014b50,true);v.setUint16(at+4,20,true);v.setUint16(at+6,20,true);v.setUint16(at+8,0x800,true);v.setUint16(at+14,0x21,true);v.setUint32(at+16,r.crc,true);v.setUint32(at+20,r.bytes.length,true);v.setUint32(at+24,r.bytes.length,true);v.setUint16(at+28,r.name.length,true);v.setUint32(at+42,r.offset,true);out.set(r.name,at+46);at+=46+r.name.length;}
 v.setUint32(at,0x06054b50,true);v.setUint16(at+8,rows.length,true);v.setUint16(at+10,rows.length,true);v.setUint32(at+12,centralLength,true);v.setUint32(at+16,centralStart,true);return out;
}
