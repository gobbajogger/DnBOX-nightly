// SPDX-License-Identifier: GPL-3.0-only
// Typed event consumer, not a project binary decoder or engine renderer.
const MAX=0x0fffffff,PPQ=9600,enc=new TextEncoder();
const fail=s=>{throw Error(s);};
const integer=(v,lo,hi)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
function keys(o,list){if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).sort().join('|')!==[...list].sort().join('|'))fail('Unsupported schema fields');}
function text(s,max=80){if(typeof s!=='string'||!s.length||enc.encode(s).length>max||/[\x00-\x1f\x7f]/.test(s))fail('Invalid text');return s;}
function list(x,max){if(!Array.isArray(x)||x.length>max)fail('Invalid collection');}
const gcd=(a,b)=>b?gcd(b,a%b):a;
function add([a,b],[c,d]){let n=a*d+c*b,m=b*d,g=gcd(n,m);return[n/g,m/g];}
function ticksAt(t,sample){let q=[0n,1n];for(let i=0;i<t.tempos.length;i++){let at=t.tempos[i].sample;if(at>=sample)break;let until=Math.min(sample,t.tempos[i+1]?.sample??sample);q=add(q,[BigInt(until-at)*1000000n*BigInt(PPQ),BigInt(t.sampleRate)*BigInt(t.tempos[i].microsecondsPerQuarter)]);}let r=(q[0]*2n+q[1])/(2n*q[1]);if(r>BigInt(Number.MAX_SAFE_INTEGER))fail('Tick overflow');return Number(r);}
function vlq(v){if(!integer(v,0,MAX))fail('MIDI delta exceeds four-byte VLQ');let a=[v%128];while(v=Math.floor(v/128))a.unshift((v%128)|128);return a;}
const big=(v,n)=>Array.from({length:n},(_,i)=>Math.floor(v/256**(n-1-i))%256);
const meta=(type,data)=>[255,type,...vlq(data.length),...data];
function chunk(name,data){if(data.length>0xffffffff)fail('Chunk overflow');return [...enc.encode(name),...big(data.length,4),...data];}
function track(events,end,name){let bytes=[0,...meta(3,Array.from(enc.encode(name)))],prev=0;for(const e of events){bytes.push(...vlq(e.tick-prev),...e.bytes);prev=e.tick;}bytes.push(...vlq(end-prev),255,47,0);return chunk('MTrk',bytes);}
function validate(t){
 keys(t,['schema','authority','sampleRate','endSample','tracks','tempos','timeSignatures','markers','annotations','events']);if(t.schema!=='dnbox-midi-trace/1')fail('Unsupported trace');
 keys(t.authority,['kind','source','projectSha256','seed']);if(!['synthetic','source-executed'].includes(t.authority.kind)||!/^([0-9a-f]{64})$/.test(t.authority.projectSha256)||!integer(t.authority.seed,0,0xffffffff))fail('Missing trace authority');text(t.authority.source,120);
 if(t.sampleRate!==44100||!integer(t.endSample,1,44100*86400))fail('Unsupported rate or finite range');
 for(const [key,max]of [['tracks',64],['tempos',1024],['timeSignatures',1024],['markers',10000],['annotations',100000],['events',100000]])list(t[key],max);
 if(!t.tracks.length||!t.tempos.length||t.tempos[0].sample!==0)fail('Tracks and initial tempo required');
 let ids=new Set();for(const r of t.tracks){keys(r,['id','name']);if(!/^[A-Za-z][A-Za-z0-9_-]{0,47}$/.test(r.id)||ids.has(r.id))fail('Invalid track identity');ids.add(r.id);text(r.name);}
 const within=x=>{if(!integer(x.sample,0,t.endSample))fail('Event outside range');};let prior=-1;
 for(const x of t.tempos){keys(x,['sample','microsecondsPerQuarter']);within(x);if(x.sample<=prior||!integer(x.microsecondsPerQuarter,1,0xffffff))fail('Invalid tempo map');prior=x.sample;}
 prior=-1;for(const x of t.timeSignatures){keys(x,['sample','numerator','denominator']);within(x);if(x.sample<=prior||!integer(x.numerator,1,255)||!integer(x.denominator,1,128)||(x.denominator&(x.denominator-1)))fail('Invalid meter');prior=x.sample;}
 for(const x of t.markers){keys(x,['sample','label']);within(x);text(x.label,128);}
 for(const x of t.annotations){keys(x,['sample','track','kind','value']);within(x);if(!ids.has(x.track)||!['slide','tie','accent','probability','motion','breakSlice','sourcePattern'].includes(x.kind))fail('Unsupported annotation');text(x.value,1024);}
 const orders=new Set();let prevSample=-1,prevOrder=-1,held=new Set();
 for(const x of t.events){keys(x,['sample','order','track','type','channel','note','velocity']);within(x);if(!integer(x.order,0,Number.MAX_SAFE_INTEGER)||orders.has(x.order)||!ids.has(x.track)||!['noteOn','noteOff'].includes(x.type)||!integer(x.channel,0,15)||!integer(x.note,0,127)||!integer(x.velocity,x.type==='noteOn'?1:0,127))fail('Invalid note event');
  if(x.sample<prevSample||(x.sample===prevSample&&x.order<=prevOrder))fail('Trace must retain source ordering');orders.add(x.order);prevSample=x.sample;prevOrder=x.order;
  const key=x.track+':'+x.channel+':'+x.note;if(x.type==='noteOn'){if(held.has(key))fail('Ambiguous overlapping same-key notes');held.add(key);}else{if(!held.delete(key))fail('Note release has no onset');}
 }
 if(held.size)fail('Unclosed notes at finite boundary; supply authoritative releases');
}
export function exportTrace(t){validate(t);const end=ticksAt(t,t.endSample),tempos=t.tempos.map(x=>({...x,tick:ticksAt(t,x.sample)}));
 // Tempo changes collapsing onto one tick make the source tempo boundary ambiguous.
 for(let i=1;i<tempos.length;i++)if(tempos[i].tick<=tempos[i-1].tick)fail('Tempo boundaries collide after quantization');
 const conductor=[...tempos.map(x=>({tick:x.tick,rank:0,bytes:meta(81,big(x.microsecondsPerQuarter,3))})),...t.timeSignatures.map(x=>({tick:ticksAt(t,x.sample),rank:1,bytes:meta(88,[x.numerator,Math.log2(x.denominator),24,8])})),...t.markers.map(x=>({tick:ticksAt(t,x.sample),rank:2,bytes:meta(6,Array.from(enc.encode(x.label)))}))].sort((a,b)=>a.tick-b.tick||a.rank-b.rank);
 const events=t.events.map(x=>({...x,tick:ticksAt(t,x.sample),bytes:[(x.type==='noteOn'?144:128)+x.channel,x.note,x.velocity]}));
 // A source callback may deliberately emit an immediate on/off pulse (drums,
 // or the final boundary onset followed by seq_stop). Preserve it verbatim.
 // A positive source duration lost by tick quantization is still an error.
 const starts=new Map(),sameSampleNotes=[];
 for(const e of events){const key=e.track+':'+e.channel+':'+e.note;
  if(e.type==='noteOn')starts.set(key,e);
  else{const onset=starts.get(key);
   if(e.sample>onset.sample&&e.tick<=onset.tick)fail('Note duration collapses at MIDI resolution');
   if(e.sample===onset.sample)sameSampleNotes.push({track:e.track,channel:e.channel,note:e.note,sample:e.sample,onOrder:onset.order,offOrder:e.order,atEndBoundary:e.sample===t.endSample});
   starts.delete(key);
  }
 }
 const tracks=t.tracks.map(x=>({id:x.id,name:x.name,events:events.filter(e=>e.track===x.id)}));
 const make=selection=>{const data=[...chunk('MThd',[0,1,...big(selection.length+1,2),...big(PPQ,2)]),...track(conductor,end,'Tempo and patterns')];for(const r of selection)for(const byte of track(r.events,end,r.name))data.push(byte);return Uint8Array.from(data);};
 const sampleAt=tick=>{let result=0;for(let i=0;i<tempos.length;i++){if(tempos[i].tick>=tick)break;let next=Math.min(tick,tempos[i+1]?.tick??tick);result+=(next-tempos[i].tick)*tempos[i].microsecondsPerQuarter*t.sampleRate/(PPQ*1000000);}return result;};
 let maxErrorSamples=0;for(const x of [...events,...tempos,...t.timeSignatures,...t.markers,{sample:t.endSample}])maxErrorSamples=Math.max(maxErrorSamples,Math.abs(sampleAt(ticksAt(t,x.sample))-x.sample));
 return{midi:make(tracks),clips:tracks.map(r=>({filename:r.id+'.mid',midi:make([r])})),annotations:structuredClone(t.annotations),timing:{ppq:PPQ,maxErrorSamples,maxErrorMilliseconds:maxErrorSamples*1000/t.sampleRate,endTick:end},metadata:{schema:t.schema,authority:structuredClone(t.authority),sampleRate:t.sampleRate,endSample:t.endSample,tracks:structuredClone(t.tracks),tempos:structuredClone(t.tempos),timeSignatures:structuredClone(t.timeSignatures),markers:structuredClone(t.markers),sameSampleNotes,note:'Per-track clips retain the full finite timeline from sample zero. MIDI notes are not engine sound or proprietary project backups.'}};
}
