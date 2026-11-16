// SPDX-License-Identifier: GPL-3.0-only
// Live R22 readouts. One renderer per function. The shape is the current value
// through that engine's transfer curve. Idle and zero-depth stay on one frame.
// Curves cited from the firmware repository main:
//   firmware/src/app/ui.c:6838-6924 Chicago saw↔square and Miami/Juno pulse plot
//   experiments/original_synth/oscillator_motion.c:27-37,103-106 pulse width
//   firmware/src/app/ui.c:7229-7319 Chicago exponential ADSR, linear other branch
//   firmware/src/dsp/drum909.c:24-26,274-283 kick pitch drop
//   firmware/src/app/ui.c:8047-8071 attack click and 808 tone lowpass
//   firmware/src/app/ui.c:8084-8108 snappy noise and level meter
// Animation is re-render after interpolating the parameter. No decorative motion.

const MERGED={
 G023:'WAVE',G024:'WAVE',G025:'WAVE',
 G037:'ADSR',G038:'ADSR',G049:'ADSR',
 G015:'ATTACK',G048:'ATTACK',
 G016:'DECAY',G071:'DECAY',
 G027:'LFO',G028:'LFO',
 G050:'TAPE',G051:'TAPE',
 G021:'TONE',G054:'TONE',
 G013:'TUNE',G014:'TUNE',G017:'TUNE',
 G029:'PWM',G032:'FILTER',G033:'FILTER',G031:'ENV'
};
const NAMES={
 WAVE:'WAVE',ENV:'ENV',ADSR:'ADSR',PWM:'PWM',PULSE:'PWM',LFO:'LFO',
 FILTER:'FILTER',CUTOFF:'FILTER',RES:'FILTER',TUNE:'TUNE',PITCH:'TUNE',
 DECAY:'DECAY',ATTACK:'ATTACK',TAPE:'TAPE',TONE:'TONE',LEVEL:'LEVEL',
 GLIDE:'GLIDE',PAN:'PAN',HPF:'FILTER',PEAK:'FILTER'
};

export function unit(value){
 const n=Number(value);
 if(!Number.isFinite(n)) return 0;
 if(n>1) return Math.min(1,n/127);
 return Math.min(1,Math.max(0,n));
}
function fnOf(id){
 const key=String(id??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 return MERGED[key]||NAMES[key]||'LEVEL';
}
function num(p,d=1){return (Math.round(p*1000)/1000).toFixed(d);}
function path(points){
 return points.map((p,i)=>(i?'L':'M')+num(p[0])+' '+num(p[1])).join(' ');
}

// ui.c:6914-6920. mix 0 is a falling saw, mix 127 is a square. 29 samples, phase i%14.
export function chicagoWaveSamples(mix){
 const m=Math.max(0,Math.min(127,mix|0));
 const ys=[];
 for(let i=0;i<29;i++){
  const phase=i%14;
  const saw=15-phase*30/13;
  const square=phase<7?15:-15;
  ys.push((saw*(127-m)+square*m)/127);
 }
 return ys;
}
function wavePath(engine, value){
 const u=unit(value);
 if(engine==='juno'||engine==='miami'){
  // oscillator_motion.c:103-106 and :33-37. Pulse width, not the Chicago crossfade.
  const width=Math.min(.99,Math.max(.01,u));
  const duty=engine==='juno'?width:0.10+0.8*width;
  const pts=[];
  for(let i=0;i<29;i++){
   const p=i/28;
   const y=p<duty?4:20;
   pts.push([i*40/28,y]);
  }
  return path(pts);
 }
 const ys=chicagoWaveSamples(Math.round(u*127));
 return path(ys.map((y,i)=>[i*40/28, 12-y*12/15]));
}

// ui.c:7248-7256 and :7304-7308. x^4 into the RC constants, then the exponential segments.
export function chicagoTimes(a,d,r){
 const q=v=>{const x=v*v;return x*x;};
 return {A:13*q(a)+0.001,D:25*q(d)+0.001,R:25*q(r)+0.002};
}
export function chicagoLevel(stage,t,e){
 if(stage===0) return Math.min(1,1.3-1.3*Math.exp(-t/e.A));
 if(stage===1) return e.S+(1-e.S)*Math.exp(-t/e.D);
 return e.S*Math.exp(-t/Math.max(e.R,1e-6));
}
// ui.c:7313-7319. Stage widths follow those durations. Hold is illustrative.
export function adsrWidths(e){
 const dur=[e.A*Math.log(1.3/0.3), e.D*Math.log(100), e.S>0.04?e.R*Math.log(e.S/0.04):0];
 const sum=dur[0]+dur[1]+dur[2]||1;
 return dur.map(d=>d/sum);
}
function adsrPath(engine, value, state){
 const u=unit(value);
 const a=state.attack??u, d=state.decay??0.5, s=state.sustain??0.6, r=state.release??0.4;
 const curved=engine!=='juno';
 const e=chicagoTimes(a,d,r); e.S=s;
 const w=adsrWidths(e);
 const pts=[];
 const push=(x0,x1,fn)=>{
  const n=8;
  for(let i=0;i<=n;i++){
   const t=i/n;
   const level=curved?fn(t):fn(0)+(fn(1)-fn(0))*t;
   pts.push([x0+(x1-x0)*t, 22-Math.max(0,Math.min(1,level))*18]);
  }
 };
 const hold=6, timed=34;
 const x1=timed*w[0], x2=x1+timed*w[1], x3=x2+hold, x4=x3+timed*w[2];
 push(0,x1,t=>chicagoLevel(0,t*e.A*Math.log(1.3/0.3),e));
 push(x1,x2,t=>chicagoLevel(1,t*e.D*Math.log(100),e));
 pts.push([x3, 22-s*18]);
 push(x3,x4,t=>chicagoLevel(2,t*(e.S>0.04?e.R*Math.log(e.S/0.04):0),e));
 return path(pts);
}

// drum909.c:276-283. tau is the Tune time constant, 6..32 ms.
export function bd909Hz(tau,m,pm,tMs){
 tau=tau<6?6:tau>32?32:tau;
 m=m<0?0:m>1?1:m;
 if(!(pm>0)) pm=1;
 const base=49*(1+m*(pm-1));
 const df=4.6*tau*(1+1.2*m);
 const t=tMs-16;
 return base+(t>0?df*Math.exp(-t/tau):df);
}
function tunePath(engine, value){
 const u=unit(value);
 if(engine==='909'||engine==='808'){
  const tau=32-u*26;
  const pts=[];
  for(let i=0;i<24;i++){
   const hz=bd909Hz(tau,u,1,i*100/23);
   const y=Math.log2(hz/40)/3.32;
   pts.push([i*40/23, 22-Math.max(0,Math.min(1,y))*18]);
  }
  return path(pts);
 }
 const pts=[];
 const cycles=1+u*2;
 for(let i=0;i<24;i++) pts.push([i*40/23, 12-8*Math.sin(6.2831853*i*cycles/23)]);
 return path(pts);
}

function filterPath(value, state){
 const cut=unit(state.cutoff??value);
 const res=unit(state.res??0);
 const knee=4+cut*28;
 const peak=4+res*10;
 const pts=[[0,8],[knee,8],[knee,8-peak],[knee+6,18],[40,20]];
 return path(pts);
}
function decayPath(value){
 const u=Math.max(0.05,unit(value));
 const pts=[];
 for(let i=0;i<20;i++){
  const env=Math.exp(-i/(3+u*12));
  pts.push([i*40/19, 20-env*16]);
 }
 return path(pts);
}
function attackPath(value){
 const h=4+unit(value)*14;
 return path([[2,20],[6,20-h],[10,20],[40,20]]);
}
function lfoPath(value, state){
 const depth=state.depth==null?1:Number(state.depth);
 if(!depth) return path([[0,12],[40,12]]);
 const rate=0.5+unit(value)*3;
 const pts=[];
 for(let i=0;i<24;i++) pts.push([i*40/23, 12-depth*8*Math.sin(6.2831853*i*rate/23)]);
 return path(pts);
}
function tapePath(value){
 const u=unit(value);
 const sag=4+u*8;
 return path([[4,10],[8,10],[8,6],[12,6],[12,10],[16,10],[18,10+sag],[28,10+sag],[30,10],[34,10],[34,6],[38,6],[38,10]]);
}
function tonePath(value){
 const u=unit(value);
 const knee=6+u*24;
 return path([[0,8],[knee,8],[Math.min(40,knee+10),20],[40,20]]);
}
function levelPath(value){
  const n=Math.round(unit(value)*6);
  const pts=[];
  for(let i=0;i<6;i++) pts.push([2+i*6, i<n?18-i*2:20]);
  return path(pts);
}
function glidePath(value){
 const u=unit(value);
 return path([[0,16],[8+u*10,16],[20,8],[40,8]]);
}
function panPath(value){
 const u=unit(value);
 return path([[0,12],[40,12],[u*40,6],[u*40,18]]);
}

const DRAW={
 WAVE:wavePath, PWM:wavePath, ADSR:adsrPath, ENV:adsrPath, FILTER:filterPath,
 TUNE:tunePath, DECAY:decayPath, ATTACK:attackPath, LFO:lfoPath, TAPE:tapePath,
 TONE:tonePath, LEVEL:levelPath, GLIDE:glidePath, PAN:panPath
};

export function render(fnId, value, engineId='chicago', state={}){
 const fn=fnOf(fnId);
 const draw=DRAW[fn]||levelPath;
 const live=!!state.live;
 const depth=state.depth;
 if(fn==='LFO' && depth===0) return {fn,d:lfoPath(value,{depth:0}),live:false};
 if(!live && state.age!=null) state={...state, age:0};
 const d=draw(engineId, value, state);
 return {fn, engine:engineId, d, live};
}
export function renderSvg(fnId, value, engineId, state={}){
 const {d,fn}=render(fnId,value,engineId,state);
 const motion=state.live && state.depth!==0?'':'';
 return `<svg class="glyph readout" data-fn="${fn}" viewBox="0 0 40 24" width="40" height="24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
// Interpolate the parameter and re-render. Idle or zero depth is one stable frame.
export function morphFrames(fnId, from, to, engineId, state={}){
 if(!state.live || state.depth===0) return [render(fnId, from, engineId, {...state, live:false})];
 const samples=[0,8,16,24,40,60,90,120,160,220,300,420,580,800,1100,1500,2000,2600];
 const span=samples[samples.length-1];
 return samples.map(ms=>{
  const t=ms/span;
  return render(fnId, from+(to-from)*t, engineId, state);
 });
}
