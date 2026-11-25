// SPDX-License-Identifier: GPL-3.0-only
import {sj6Catalog} from './dnr3-sj6-catalog.mjs';
// Original enum/descriptor metadata: pinned S1Parameter.h and S1DSPKernel.hpp.
// Original AU units are reference metadata, NOT the firmware detent format.
const catalog=[
["osc","Oscillators",[[0,"OSC 1 Morph","index1","Generic"],[1,"OSC 2 Morph","index2","Generic"],[2,"OSC Balance","morphBalance","Generic"],[3,"OSC 1 Semitones","morph1SemitoneOffset","RelativeSemiTones"],[4,"OSC 2 Semitones","morph2SemitoneOffset","RelativeSemiTones"],[5,"OSC 1 Level","morph1Volume","Generic"],[6,"OSC 2 Level","morph2Volume","Generic"],[30,"OSC 2 Detune","morph2Detuning","Generic"],[146,"Band Limit","oscBandlimitEnable","Generic"]]],
["sub-fm","Sub, FM & noise",[[7,"Sub Level","subVolume","Generic"],[8,"Sub Octave","subOctaveDown","Generic"],[9,"Sub Wave","subIsSquare","Generic"],[10,"FM Level","fmVolume","Generic"],[11,"FM Index","fmAmount","Generic"],[12,"Noise Level","noiseVolume","Generic"]]],
["filter","Filter",[[16,"Cutoff","cutoff","Hertz"],[17,"Resonance","resonance","Generic"],[19,"Filter Envelope","filterADSRMix","Generic"],[115,"Filter Type","filterType","Generic"],[149,"Envelope Pitch Tracking","adsrPitchTracking","Generic"],[255,"Filter Link",null,null]]],
["filter-env","Filter envelope",[[22,"Filter Attack","filterAttackDuration","Seconds"],[23,"Filter Decay","filterDecayDuration","Seconds"],[24,"Filter Sustain","filterSustainLevel","Generic"],[25,"Filter Release","filterReleaseDuration","Seconds"]]],
["amp-env","Amp envelope",[[26,"Amp Attack","attackDuration","Seconds"],[27,"Amp Decay","decayDuration","Seconds"],[28,"Amp Sustain","sustainLevel","Generic"],[29,"Amp Release","releaseDuration","Seconds"]]],
["voice","Voice & output",[[20,"Mono","isMono","Generic"],[120,"Legato","monoIsLegato","Generic"],[21,"Glide","glide","Generic"],[32,"Output Level","masterVolume","Generic"],[121,"Stereo Widen","widen","Generic"],[144,"Parameter Smooth Time","portamentoHalfTime","Generic"]]],
["tuning","Tuning & bend ranges",[[143,"A4 Reference","frequencyA4","Hertz"],[148,"Transpose","transpose","Generic"],[141,"Bend Down Range","pitchbendMinSemitones","Generic"],[142,"Bend Up Range","pitchbendMaxSemitones","Generic"]]],
["lfo","LFO & sync",[[13,"LFO 1 Shape","lfo1Index","Generic"],[14,"LFO 1 Depth","lfo1Amplitude","Generic"],[15,"LFO 1 Rate","lfo1Rate","Rate"],[45,"LFO 2 Shape","lfo2Index","Generic"],[46,"LFO 2 Depth","lfo2Amplitude","Generic"],[47,"LFO 2 Rate","lfo2Rate","Generic"],[139,"Tempo Sync","tempoSyncToArpRate","Generic"]]],
["mod","Modulation destinations",[[48,"Cutoff LFO","cutoffLFO","Generic"],[49,"Resonance LFO","resonanceLFO","Generic"],[50,"OSC Mix LFO","oscMixLFO","Generic"],[51,"Reverb Mix LFO","reverbMixLFO","Generic"],[52,"Amp Decay LFO","decayLFO","Generic"],[53,"Noise LFO","noiseLFO","Generic"],[54,"FM LFO","fmLFO","Generic"],[55,"Detune LFO","detuneLFO","Generic"],[56,"Filter Envelope LFO","filterEnvLFO","Generic"],[57,"Pitch LFO","pitchLFO","Generic"],[58,"Bitcrush LFO","bitcrushLFO","Generic"],[59,"Tremolo LFO","tremoloLFO","Generic"]]],
["pan-crush","Auto pan & bitcrush",[[35,"Pan Depth","autoPanAmount","Generic"],[36,"Pan Rate","autoPanFrequency","Hertz"],[34,"Bitcrush Rate","bitCrushSampleRate","Hertz"]]],
["reverb","Reverb",[[37,"Reverb Enable","reverbOn","Generic"],[38,"Reverb Feedback","reverbFeedback","Generic"],[39,"Reverb High-Pass","reverbHighPass","Generic"],[40,"Reverb Mix","reverbMix","Generic"]]],
["delay","Delay",[[41,"Delay Enable","delayOn","Generic"],[42,"Delay Feedback","delayFeedback","Generic"],[43,"Delay Time","delayTime","Seconds"],[44,"Delay Mix","delayMix","Generic"],[137,"Delay Input Cutoff Tracking","delayInputCutoffTrackingRatio","Hertz"],[138,"Delay Input Resonance","delayInputResonance","Generic"]]],
["phaser","Phaser",[[116,"Phaser Mix","phaserMix","Generic"],[117,"Phaser Rate","phaserRate","Hertz"],[118,"Phaser Feedback","phaserFeedback","Generic"],[119,"Phaser Notch Width","phaserNotchWidth","Hertz"]]],
["comp-master","Master compressor",[[122,"Master compressor Ratio","compressorMasterRatio","Generic"],[125,"Master compressor Threshold","compressorMasterThreshold","Generic"],[128,"Master compressor Attack","compressorMasterAttack","Generic"],[131,"Master compressor Release","compressorMasterRelease","Generic"],[134,"Master compressor Makeup","compressorMasterMakeupGain","Generic"]]],
["comp-in","Reverb input compressor",[[123,"Reverb input compressor Ratio","compressorReverbInputRatio","Generic"],[126,"Reverb input compressor Threshold","compressorReverbInputThreshold","Generic"],[129,"Reverb input compressor Attack","compressorReverbInputAttack","Generic"],[132,"Reverb input compressor Release","compressorReverbInputRelease","Generic"],[135,"Reverb input compressor Makeup","compressorReverbInputMakeupGain","Generic"]]],
["comp-wet","Reverb wet compressor",[[124,"Reverb wet compressor Ratio","compressorReverbWetRatio","Generic"],[127,"Reverb wet compressor Threshold","compressorReverbWetThreshold","Generic"],[130,"Reverb wet compressor Attack","compressorReverbWetAttack","Generic"],[133,"Reverb wet compressor Release","compressorReverbWetRelease","Generic"],[136,"Reverb wet compressor Makeup","compressorReverbWetMakeupGain",null]]],
["arp","Arpeggiator & sequencer",[[62,"Arp Enable","arpIsOn","Generic"],[65,"Sequencer Enable","arpIsSequencer","Generic"],[60,"Arp Direction","arpDirection","Generic"],[61,"Arp Interval","arpInterval","Generic"],[63,"Arp Octave Range","arpOctave","Generic"],[64,"Arp Source BPM","arpRate","BPM"],[66,"Sequence Length","arpTotalSteps","Generic"],[147,"Tempo Multiplier","arpSeqTempoMultiplier","Generic"]]],
["seq-pitch","Sequencer pitches",[[67,"Step 1 Pitch","sequencerPattern00","Generic"],[68,"Step 2 Pitch","sequencerPattern01","Generic"],[69,"Step 3 Pitch","sequencerPattern02","Generic"],[70,"Step 4 Pitch","sequencerPattern03","Generic"],[71,"Step 5 Pitch","sequencerPattern04","Generic"],[72,"Step 6 Pitch","sequencerPattern05","Generic"],[73,"Step 7 Pitch","sequencerPattern06","Generic"],[74,"Step 8 Pitch","sequencerPattern07","Generic"],[75,"Step 9 Pitch","sequencerPattern08","Generic"],[76,"Step 10 Pitch","sequencerPattern09","Generic"],[77,"Step 11 Pitch","sequencerPattern10","Generic"],[78,"Step 12 Pitch","sequencerPattern11","Generic"],[79,"Step 13 Pitch","sequencerPattern12","Generic"],[80,"Step 14 Pitch","sequencerPattern13","Generic"],[81,"Step 15 Pitch","sequencerPattern14","Generic"],[82,"Step 16 Pitch","sequencerPattern15","Generic"]]],
["seq-octave","Sequencer octaves",[[83,"Step 1 Octave","sequencerOctBoost00","Generic"],[84,"Step 2 Octave","sequencerOctBoost01","Generic"],[85,"Step 3 Octave","sequencerOctBoost02","Generic"],[86,"Step 4 Octave","sequencerOctBoost03","Generic"],[87,"Step 5 Octave","sequencerOctBoost04","Generic"],[88,"Step 6 Octave","sequencerOctBoost05","Generic"],[89,"Step 7 Octave","sequencerOctBoost06","Generic"],[90,"Step 8 Octave","sequencerOctBoost07","Generic"],[91,"Step 9 Octave","sequencerOctBoost08","Generic"],[92,"Step 10 Octave","sequencerOctBoost09","Generic"],[93,"Step 11 Octave","sequencerOctBoost10","Generic"],[94,"Step 12 Octave","sequencerOctBoost11","Generic"],[95,"Step 13 Octave","sequencerOctBoost12","Generic"],[96,"Step 14 Octave","sequencerOctBoost13","Generic"],[97,"Step 15 Octave","sequencerOctBoost14","Generic"],[98,"Step 16 Octave","sequencerOctBoost15","Generic"]]],
["seq-on","Sequencer steps",[[99,"Step 1 Enable","sequencerNoteOn00","Generic"],[100,"Step 2 Enable","sequencerNoteOn01","Generic"],[101,"Step 3 Enable","sequencerNoteOn02","Generic"],[102,"Step 4 Enable","sequencerNoteOn03","Generic"],[103,"Step 5 Enable","sequencerNoteOn04","Generic"],[104,"Step 6 Enable","sequencerNoteOn05","Generic"],[105,"Step 7 Enable","sequencerNoteOn06","Generic"],[106,"Step 8 Enable","sequencerNoteOn07","Generic"],[107,"Step 9 Enable","sequencerNoteOn08","Generic"],[108,"Step 10 Enable","sequencerNoteOn09","Generic"],[109,"Step 11 Enable","sequencerNoteOn10","Generic"],[110,"Step 12 Enable","sequencerNoteOn11","Generic"],[111,"Step 13 Enable","sequencerNoteOn12","Generic"],[112,"Step 14 Enable","sequencerNoteOn13","Generic"],[113,"Step 15 Enable","sequencerNoteOn14","Generic"],[114,"Step 16 Enable","sequencerNoteOn15","Generic"]]],
];
const stepRole={ 'seq-pitch':'pitch','seq-octave':'octave','seq-on':'on' };
const catalogMap=entries=>new Map(entries.flatMap(([key,title,items],groupOrder)=>items.map(([id,label,symbol,originalUnit],rowOrder)=>
 [id,Object.freeze({key,title,groupOrder,rowOrder,label,symbol,originalUnit:originalUnit??null,
   ...(key==='arp'?{section:'sequence'}:key in stepRole?{section:'sequence',step:rowOrder,stepRole:stepRole[key]}:{section:'sound'})})])));
const rows=catalogMap(catalog),sj6=catalogMap(sj6Catalog);
const extras=[
 [240,'Hold','performance','Keyboard & MIDI',1,'toggle'],
 [241,'White Keys Only','performance','Keyboard & MIDI',1,'toggle'],
 [242,'MIDI Velocity Sensitive','performance','Keyboard & MIDI',1,'toggle'],
 [243,'Microtonal Keys','performance','Keyboard & MIDI',1,'toggle'],
 [244,'Scale','tuning','Tuning & bend ranges'],
 [245,'Reset Tuning','tuning','Tuning & bend ranges',1,'action'],
 [246,'Mod Wheel Destination','performance','Keyboard & MIDI'],
];
for(const [id,label,key,title,max,type] of extras) rows.set(id,Object.freeze({
 id,key,title,label,groupOrder:key==='tuning'?6:6.5,rowOrder:id,section:'sound',max,type,originalUnit:null,symbol:null
}));
// DnBOX panel extensions are bank-qualified, never counted as original AU IDs.
for(const [id,label,key,title,section,groupOrder,max,type] of [
 [240,'Start Snap','arp','Arpeggiator & sequencer','sequence',16,1,'toggle'],
 [241,'Sequence Lock','arp','Arpeggiator & sequencer','sequence',16,1,'toggle'],
 [242,'Scale','tuning','Tuning & performance','sound',6],
 [243,'MIDI Velocity Curve','tuning','Tuning & performance','sound',6,2,'velocity-curve'],
]) sj6.set(id,Object.freeze({id,key,title,section,groupOrder,rowOrder:id,label,max,type,originalUnit:null,symbol:null}));
export function describeOriginalSynth(bank,id,max){
 if(bank===2){
  const row=rows.get(id);
  if(!row || (id===255&&max!==1) || (row.max!==undefined&&max!==row.max))return undefined;
  if(row.stepRole==='pitch'&&max===24)return {...row,offset:-12};
  return row;
 }
 if(bank===3){const row=sj6.get(id);return row?.max===undefined||row.max===max?row:undefined;}
}
export function groupSynthRows(rows){
 const groups=new Map();
 for(const row of rows){
  const m=row.presentation;
  const key=m?.key??'other';
  if(!groups.has(key))groups.set(key,{key,title:m?.title??'Other firmware controls',order:m?.groupOrder??Infinity,rows:[]});
  groups.get(key).rows.push(row);
 }
 return [...groups.values()].sort((a,b)=>a.order-b.order).map(g=>({...g,rows:g.rows.sort((a,b)=>(a.presentation?.rowOrder??a.id)-(b.presentation?.rowOrder??b.id))}));
}
