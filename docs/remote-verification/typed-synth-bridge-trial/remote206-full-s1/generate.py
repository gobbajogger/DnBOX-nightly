from pathlib import Path
import re,json
base=Path('../fw/experiments/sound-hardware-v1/factory-admission/original')
header=(base/'S1Parameter.h').read_text()
symbols={int(n):s for s,n in re.findall(r'^\s*(\w+)\s*=\s*(\d+)',header,re.M) if s!='S1ParameterCount'}
assert list(symbols)==list(range(150))
units=dict(re.findall(r'^\s*\{\s*(\w+),.*?kAudioUnitParameterUnit_(\w+)',(base/'S1DSPKernel.hpp').read_text(),re.M))
groups=[
('osc','Oscillators',[0,1,2,3,4,5,6,30,146],'OSC 1 Morph|OSC 2 Morph|OSC Balance|OSC 1 Semitones|OSC 2 Semitones|OSC 1 Level|OSC 2 Level|OSC 2 Detune|Band Limit'),
('sub-fm','Sub, FM & noise',[7,8,9,10,11,12],'Sub Level|Sub Octave|Sub Wave|FM Level|FM Index|Noise Level'),
('filter','Filter',[16,17,19,115,149],'Cutoff|Resonance|Filter Envelope|Filter Type|Envelope Pitch Tracking'),
('filter-env','Filter envelope',range(22,26),'Filter Attack|Filter Decay|Filter Sustain|Filter Release'),
('amp-env','Amp envelope',range(26,30),'Amp Attack|Amp Decay|Amp Sustain|Amp Release'),
('voice','Voice & output',[20,120,21,32,121,144],'Mono|Legato|Glide|Output Level|Stereo Widen|Parameter Smooth Time'),
('tuning','Tuning & bend ranges',[143,148,141,142],'A4 Reference|Transpose|Bend Down Range|Bend Up Range'),
('lfo','LFO & sync',[13,14,15,45,46,47,139],'LFO 1 Shape|LFO 1 Depth|LFO 1 Rate|LFO 2 Shape|LFO 2 Depth|LFO 2 Rate|Tempo Sync'),
('mod','Modulation destinations',range(48,60),'Cutoff LFO|Resonance LFO|OSC Mix LFO|Reverb Mix LFO|Amp Decay LFO|Noise LFO|FM LFO|Detune LFO|Filter Envelope LFO|Pitch LFO|Bitcrush LFO|Tremolo LFO'),
('pan-crush','Auto pan & bitcrush',[35,36,34],'Pan Depth|Pan Rate|Bitcrush Rate'),
('reverb','Reverb',[37,38,39,40],'Reverb Enable|Reverb Feedback|Reverb High-Pass|Reverb Mix'),
('delay','Delay',[41,42,43,44,137,138],'Delay Enable|Delay Feedback|Delay Time|Delay Mix|Delay Input Cutoff Tracking|Delay Input Resonance'),
('phaser','Phaser',range(116,120),'Phaser Mix|Phaser Rate|Phaser Feedback|Phaser Notch Width'),
]
for offset,key,title in [(0,'comp-master','Master compressor'),(1,'comp-in','Reverb input compressor'),(2,'comp-wet','Reverb wet compressor')]:
    groups.append((key,title,[x+offset for x in range(122,137,3)],'|'.join(f'{title} {x}' for x in ['Ratio','Threshold','Attack','Release','Makeup'])))
groups.append(('arp','Arpeggiator & sequencer',[62,65,60,61,63,64,66,147],'Arp Enable|Sequencer Enable|Arp Direction|Arp Interval|Arp Octave Range|Arp Source BPM|Sequence Length|Tempo Multiplier'))
for begin,key,title,role in [(67,'seq-pitch','Sequencer pitches','Pitch'),(83,'seq-octave','Sequencer octaves','Octave'),(99,'seq-on','Sequencer steps','Enable')]:
    groups.append((key,title,range(begin,begin+16),'|'.join(f'Step {n+1} {role}' for n in range(16))))
seen={}
result=[]
for key,title,ids,labels in groups:
    labels=labels.split('|')
    assert len(ids)==len(labels)
    rows=[]
    for id,label in zip(ids,labels):
        assert id not in seen
        seen[id]=label
        # Original AU descriptors duplicate master makeup where wet makeup
        # belongs. Do not infer a unit for an original metadata gap.
        rows.append([id,label,symbols[id],units.get(symbols[id])])
    result.append([key,title,rows])
assert set(symbols)-set(seen)=={18,31,33,140,145}
# Assigned by paired DnBOX firmware contract, never counted as original.
result[2][2].append([255,'Filter Link',None,None])
out='''// SPDX-License-Identifier: GPL-3.0-only
// Original enum/descriptor metadata: pinned S1Parameter.h and S1DSPKernel.hpp.
// Original AU units are reference metadata, NOT the firmware detent format.
const catalog=[
'''+''.join(json.dumps(g,ensure_ascii=False,separators=(',',':'))+',\n' for g in result)+'''];
const rows=new Map(catalog.flatMap(([key,title,entries],groupOrder)=>entries.map(([id,label,symbol,originalUnit],rowOrder)=>
 [id,Object.freeze({key,title,groupOrder,rowOrder,label,symbol,originalUnit})])));
export function describeOriginalSynth(bank,id,max){
 if(bank===2 && (id!==255||max===1))return rows.get(id);
 if(bank===3 && id===7)return {key:'filter',title:'Filter',groupOrder:0,rowOrder:0,label:'Cutoff'};
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
'''
Path('remote/dnr3-synth-catalog.mjs').write_text(out)
