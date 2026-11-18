import test from 'node:test';import assert from 'node:assert/strict';
const api=await import('../../web/product-site/remote/envelope-view.mjs').catch(()=>({}));
const juno={engine:'JUNO',slot:0,role:'amp-filter',available:true,snapshot:{adsr:[.01,.2,.6,.3],level:.4,selected_voice:2,stage:4,gate:0,active:1,shared_amp_filter:1}};
test('visible native envelope shows actual stage and separate raw level, not synthetic elapsed',()=>{
 assert.equal(typeof api.observedEnvelopeMarkup,'function');const html=api.observedEnvelopeMarkup(juno);
 assert.match(html,/data-observed-stage="Release"/);assert.match(html,/data-observed-level="0.4"/);assert.match(html,/<path/);assert.match(html,/AMP \/ FILTER/);assert.match(html,/Emulator/);assert.doesNotMatch(html,/elapsed|playhead/);
});
test('Chicago combined decay/sustain and filter-only level are not invented stages',()=>{
 assert.equal(typeof api.observedEnvelopeMarkup,'function');
 const amp=api.observedEnvelopeMarkup({engine:'CHICAGO',role:'amp',snapshot:{adsr:[0,.4,.6,.4],state:1,level:-.451}});
 assert.match(amp,/Decay \/ sustain/);assert.match(amp,/data-observed-level="-0.451"/);
 const filter=api.observedEnvelopeMarkup({engine:'CHICAGO',role:'filter',snapshot:{eg:.3,depth:.8}});
 assert.match(filter,/FILTER/);assert.doesNotMatch(filter,/data-observed-stage|<path/);
});
test('909 actual partial ramp has no invented attack sustain or release',()=>{
 assert.equal(typeof api.observedEnvelopeMarkup,'function');
 const html=api.observedEnvelopeMarkup({engine:'909',role:'amp',snapshot:{raw_level:.2,active:1,hold_active:0,ramp_valid:1,ramp_start:1,ramp_end:.00001,ramp_samples:100,ramp_ticks:99,ramp_left:50}});
 assert.match(html,/Decay/);assert.match(html,/<path/);assert.doesNotMatch(html,/Attack|Sustain|Release/);
 assert.equal(api.observedEnvelopeMarkup(null),'');
});
test('native physical attack and decay seconds change stage widths',()=>{
 const a=api.observedEnvelopeMarkup(juno), changed=structuredClone(juno);changed.snapshot.adsr[0]=1;
 assert.notEqual(api.observedEnvelopeMarkup(changed).match(/d="M[^"]+/)[0],a.match(/d="M[^"]+/)[0]);
});
test('dedicated-port binding paints and clears actual observations without replacing other listeners',()=>{
 assert.equal(typeof api.mountEnvelopeObservations,'function');
 const listeners=new Set(),port={addEventListener:(t,f)=>listeners.add(f),removeEventListener:(t,f)=>listeners.delete(f),start(){}};
 const pin={firmware:'a'.repeat(40),kernel:'b'.repeat(64),session:'view-1'},host={innerHTML:'',hidden:true};let now=0,tick;
 const binding=api.mountEnvelopeObservations(port,pin,{host:()=>host,targets:()=>[['JUNO',0,'amp-filter']],now:()=>now,schedule:f=>(tick=f,1),unschedule(){}});
 for(const f of listeners)f({data:{type:'envelopes',...pin,sequence:1,timeMs:10,voices:[juno]}});
 assert.equal(host.hidden,false);assert.match(host.innerHTML,/Release/);
 now=1001;tick();assert.equal(host.hidden,true);assert.equal(host.innerHTML,'');
 binding.close();assert.equal(listeners.size,0);
});
test('idle 909 keeps target decay shape separate from zero observed level',()=>{
 const voice={engine:'909',slot:0,role:'amp',snapshot:{raw_level:0,active:0,hold_active:0,ramp_valid:0,target_hold_ms:0,target_decay_ms:100}};
 const before=api.observedEnvelopeMarkup(voice);assert.match(before,/<path/);assert.match(before,/data-observed-stage="Idle"/);assert.match(before,/data-observed-level="0"/);
 voice.snapshot.target_hold_ms=100;
 assert.notEqual(api.observedEnvelopeMarkup(voice).match(/d="M[^"]+/)[0],before.match(/d="M[^"]+/)[0]);
});
test('level marker uses shared vector styling and clamps only its visual position',()=>{
 const html=api.observedEnvelopeMarkup({engine:'CHICAGO',role:'amp',snapshot:{adsr:[0,.4,.6,.4],state:1,level:-.451}});
 assert.match(html,/<circle cx="0"/);assert.match(html,/role="meter"/);assert.doesNotMatch(html,/<meter/);assert.match(html,/data-observed-level="-0.451"/);
});
