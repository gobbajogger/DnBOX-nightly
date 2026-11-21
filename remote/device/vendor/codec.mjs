// SPDX-License-Identifier: GPL-3.0-only
// Exact DNR2 source contract from native protocol-v2 exact C wire/vector contract. No production catalog inference.
export const OP=Object.freeze({HELLO:0,OPEN:1,READ:2,SET:3,DOWN:4,UP:5,KEEPALIVE:6,CLOSE:7});
export const STATUS=Object.freeze({OK:0,QUEUED:1,BAD:2,BUSY:3,STALE:4,CONFLICT:5,UNSUPPORTED:6,FULL:7,EXHAUSTED:8});
export const KIND=Object.freeze({U32:1,F32_BITS:2,HELD:3});
const valid=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
function number(v,max){if(!valid(v,max))throw RangeError('Invalid DNR2 integer');return v;}
function put(b,offset,n,value){for(let i=0;i<n;i++){b[offset+i]=value%128;value=Math.floor(value/128);}}
function get(b,offset,n){let v=0;for(let i=0;i<n;i++)v+=b[offset+i]*2**(7*i);return v;}
function putHigh(b,words){if(!Array.isArray(words)||words.length!==3)throw RangeError('Three incarnation words required');for(let i=0;i<3;i++)put(b,35+i*5,5,number(words[i],0xffffffff));}
function getHigh(b){return[0,1,2].map(i=>get(b,35+i*5,5));}
function base(data){if(!data||data.length!==51)throw Error('Invalid DNR2 frame length');const b=Array.from(data);if(b[0]!==240||b[50]!==247||b.slice(1,50).some(v=>!valid(v,127))||b.slice(1,5).join(',')!=='125,68,78,2'||[34,39,44,49].some(i=>b[i]>15))throw Error('Invalid DNR2 frame');return b;}
export function encodeCommand(c){
 if(c?.version!==2)throw Error('Invalid DNR2 version');const b=new Uint8Array(51);b.set([240,125,68,78,2,number(c.op,7)]);for(const [key,o]of [['unit',6],['client',10],['epoch',14],['request',18],['revision',22]])put(b,o,4,number(c[key],0x0fffffff));put(b,26,2,number(c.control,16383));put(b,28,2,number(c.token,16383));put(b,30,5,number(c.value,0xffffffff));putHigh(b,c.unitHigh);b[50]=247;return b;
}
export function decodeCommand(data){const b=base(data);if(b[5]>7)throw Error('Invalid DNR2 operation');return{version:2,op:b[5],unit:get(b,6,4),unitHigh:getHigh(b),client:get(b,10,4),epoch:get(b,14,4),request:get(b,18,4),revision:get(b,22,4),control:get(b,26,2),token:get(b,28,2),value:get(b,30,5)};}
export function encodeReply(r){const b=new Uint8Array(51);b.set([240,125,68,78,2,number(r.op,7)|64,number(r.status,127),number(r.kind,127)]);for(const [key,o]of [['unit',8],['client',12],['epoch',16],['request',20],['revision',24]])put(b,o,4,number(r[key],0x0fffffff));put(b,28,2,number(r.control,16383));put(b,30,5,number(r.value,0xffffffff));putHigh(b,r.unitHigh);b[50]=247;return b;}
export function decodeReply(data){const b=base(data);if(b[5]<64||b[5]>71)throw Error('Invalid DNR2 reply operation');return{op:b[5]&63,status:b[6],kind:b[7],unit:get(b,8,4),unitHigh:getHigh(b),client:get(b,12,4),epoch:get(b,16,4),request:get(b,20,4),revision:get(b,24,4),control:get(b,28,2),value:get(b,30,5)};}
export function floatToBits(value){if(typeof value!=='number'||!Number.isFinite(value))throw RangeError('Finite float required');const b=new ArrayBuffer(4),v=new DataView(b);v.setFloat32(0,value,true);const bits=v.getUint32(0,true);if((bits&0x7f800000)===0x7f800000)throw RangeError('Float32 range exceeded');return bits;}
export function bitsToFloat(bits){number(bits,0xffffffff);if((bits&0x7f800000)===0x7f800000)throw RangeError('Non-finite source float');const v=new DataView(new ArrayBuffer(4));v.setUint32(0,bits,true);return v.getFloat32(0,true);}
