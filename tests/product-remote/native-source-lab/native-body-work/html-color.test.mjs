import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{nativeRgba}from'../native-color-work/rgba.mjs';import{drumIdleFrame}from'./idle-frame.mjs';import inputs from'./factory-patterns.json'with{type:'json'};
test('actual full-frame HTML module uses native PNG conversion on every selected frame',async()=>{
 const html=readFileSync(new URL('index.html',import.meta.url),'utf8'),body=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
 const code=body.replace(/import[\s\S]*?;/g,'');let drawn;
 const options=[],select={value:'',append(o){options.push(o);if(!this.value)this.value=o.value;}},status={},ctx={createImageData(w,h){return{data:new Uint8ClampedArray(w*h*4)};},putImageData(image){drawn=image.data.slice();}},canvas={getContext(){return ctx;},setAttribute(){}};
 const document={querySelector(s){return {'#frame':select,'#status':status,'canvas':canvas}[s]??null;},createElement(t){assert.equal(t,'option');return{};}};
 new Function('document','nativeRgba','drumIdleFrame','inputs',code)(document,nativeRgba,drumIdleFrame,inputs);
 assert.equal(options.length,45);for(const o of options){select.value=o.value;select.onchange();assert.match(status.textContent,/^RENDERED /);const[,kit,voice,page]=o.value.match(/kit(\d)-voice(\d+)-page(\d+)/).map(Number);const frame=drumIdleFrame(kit,voice,page,{...inputs.frames[o.value],header:{palette:1,light:false,playing:false,recording:false,saveState:'saved',pendingCue:false,battery:3,tempo:125}});assert.deepEqual(drawn,nativeRgba(frame.pixels));}
});
