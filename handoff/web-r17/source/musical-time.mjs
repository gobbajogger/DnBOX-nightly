// Quarter-beat editor coordinates derived only from the supplied tempo map.
// Samples remain authoritative. This is not a native engine clock or playback API.
const divisions=Object.freeze({'1/4':1,'1/8':.5,'1/16':.25,'1/32':.125});
export function quarterStep(division){if(!Object.hasOwn(divisions,division))throw Error('Unknown editor snap');return divisions[division];}
export class MusicalTime{
 constructor(trace){
  const{sampleRate,endSample,tempos}=trace??{};
  if(!Number.isSafeInteger(sampleRate)||sampleRate<=0||!Number.isSafeInteger(endSample)||endSample<=0||!Array.isArray(tempos)||!tempos.length)throw Error('Complete source tempo map required');
  this.sampleRate=sampleRate;this.endSample=endSample;this.segments=[];let q=0,previous=-1;
  for(const t of tempos){if(!Number.isSafeInteger(t.sample)||t.sample<0||t.sample>endSample||t.sample<=previous||(!this.segments.length&&t.sample!==0)||!Number.isSafeInteger(t.microsecondsPerQuarter)||t.microsecondsPerQuarter<=0)throw Error('Invalid source tempo map');const last=this.segments.at(-1);if(last)q+=(t.sample-last.sample)/last.samplesPerQuarter;const rate=sampleRate*t.microsecondsPerQuarter/1e6;if(!Number.isFinite(rate)||rate<=0)throw Error('Invalid tempo rate');this.segments.push({sample:t.sample,quarter:q,samplesPerQuarter:rate,microsecondsPerQuarter:t.microsecondsPerQuarter});previous=t.sample;}
  this.totalQuarters=this.quarterAt(endSample);if(!Number.isFinite(this.totalQuarters)||this.totalQuarters<=0)throw Error('Invalid musical extent');
  this.context=this.segments.length===1?`${Number((60000000/this.segments[0].microsecondsPerQuarter).toFixed(3))} BPM · Source tempo`:'Tempo map · Source tempo';
  this.meterDescription=Array.isArray(trace.timeSignatures)&&trace.timeSignatures.length?'Source meter metadata retained; ruler uses quarter beats, not assumed bars.':'Meter unspecified by source; ruler uses quarter beats, not assumed 4/4.';
 }
 quarterAt(sample){if(!Number.isFinite(sample)||sample<0||sample>this.endSample)throw Error('Sample outside source extent');let s=this.segments[0];for(const next of this.segments){if(next.sample>sample)break;s=next;}return s.quarter+(sample-s.sample)/s.samplesPerQuarter;}
 sampleAt(quarter){if(!Number.isFinite(quarter)||quarter<0||quarter>this.totalQuarters+1e-10)throw Error('Quarter outside source extent');let s=this.segments[0];for(const next of this.segments){if(next.quarter>quarter)break;s=next;}return Math.max(0,Math.min(this.endSample,Math.round(s.sample+(quarter-s.quarter)*s.samplesPerQuarter)));}
 snap(sample,division){if(!Number.isSafeInteger(sample)||sample<0||sample>=this.endSample)throw Error('Pointer sample outside source extent');if(division==='off')return sample;const step=quarterStep(division),q=Math.max(0,Math.min(this.totalQuarters,Math.round(this.quarterAt(sample)/step)*step));return Math.min(this.endSample-1,this.sampleAt(q));}
 drawEnd(start,division){if(!Number.isSafeInteger(start)||start<0||start>=this.endSample)throw Error('Draw start outside source extent');const step=quarterStep(division==='off'?'1/16':division);return Math.max(start+1,this.sampleAt(Math.min(this.totalQuarters,this.quarterAt(start)+step)));}
 ticks(division,{maxTicks=256}={}){if(!Number.isInteger(maxTicks)||maxTicks<2||maxTicks>2048)throw Error('Invalid ruler bound');const basic=quarterStep(division==='off'?'1/16':division),step=basic*Math.max(1,Math.ceil(this.totalQuarters/basic/(maxTicks-1))),out=[];for(let i=0;i<maxTicks;i++){const quarter=i*step;if(quarter>this.totalQuarters+1e-10)break;out.push({quarter,sample:this.sampleAt(quarter),major:Math.abs(quarter-Math.round(quarter))<1e-8});}return out;}
}
