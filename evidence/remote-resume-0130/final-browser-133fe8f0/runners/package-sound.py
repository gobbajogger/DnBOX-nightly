"""Package 20 changed Sound family images and the exact browser behavior receipt."""
import argparse
import json
import runpy
from pathlib import Path

TOOLS=Path(__file__).resolve().parent
BASE=runpy.run_path(str(TOOLS/'assemble.py'))
BANKS=('chicago-chicago','chicago-miami','miami-chicago','miami-miami','breaks')


def create(source, inputs_path, sound_dir, behavior_dir, out):
    inputs=json.loads(inputs_path.read_bytes())
    receipt_path=sound_dir/'inventory.json'
    behavior_path=behavior_dir/'inventory.json'
    receipt=json.loads(receipt_path.read_bytes()); behavior=json.loads(behavior_path.read_bytes())
    assert receipt['source']==behavior['source']==inputs['source']==source
    assert receipt['tree']==behavior['tree']==inputs['tree']
    assert receipt['chromium']==behavior['chromium']==inputs['chromium']
    assert not receipt['errors'] and not behavior['errors']
    assert behavior['behaviors'].keys()=={f'{width}x{height}' for width,height in BASE['VIEWPORTS']}
    assert all(v['midiCalls']==0 for v in behavior['behaviors'].values())
    source_files=inputs['builtSiteClosure']['perFileSHA256']
    for phase in (receipt,behavior):
        assert all(source_files['remote/'+name]==sha for name,sha in phase['builtRemoteSHA256'].items())
    views={f'{width}x{height}-{bank}':(width,height,bank) for width,height in BASE['VIEWPORTS'] for bank in BANKS}
    assert receipt['states'].keys()==views.keys()
    entries={}; verified={}; index={}
    for key,(width,height,bank) in views.items():
        state=receipt['states'][key]; filename=BASE['basename'](state['filename'])
        assert tuple(state['viewport'])==tuple(state['body'])==(width,height) and not any(state['scroll']) and state['midiCalls']==0,key
        assert state['view']=='sound' and state['part']==bank.split('-')[0] and state['tempo']=='120 BPM',key
        if bank!='breaks':
            assert state['bank']==bank.split('-')[1].upper(),key
            assert state['voice']==int(state['part']=='miami'),key
        member=f'sound/{key}.png'
        entries[member]=BASE['png_data'](sound_dir/filename,(width,height),state['sha256'])
        verified[member]=(state['sha256'],(width,height))
        index[key]={'captureSource':source,'sha256':state['sha256'],'viewport':[width,height],'state':bank,
                    'captureMethod':state['capture']}
    report={'source':source,'tree':inputs['tree'],'changedSoundFrames':len(verified),'behaviorViewports':len(behavior['behaviors']),
            'referenceInputsSHA256':BASE['digest'](inputs_path.read_bytes()),'states':index}
    entries.update({'sound/inventory.json':receipt_path.read_bytes(),'behavior/inventory.json':behavior_path.read_bytes(),
                    'sound-refresh-summary.json':BASE['json_bytes'](report)})
    out.mkdir(parents=True,exist_ok=True)
    result=BASE['pack'](out/f'lane-remote-resume-0130-{source[:12]}-sound-20.tar.gz',entries,verified)
    (out/f'{source[:8]}-sound-delivery.json').write_bytes(BASE['json_bytes']({**report,'archive':result}))
    print(json.dumps({**result,'pngs':len(verified),'behaviorViewports':len(behavior['behaviors'])},indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source')
    for key in ('inputs','sound','behavior','output'):
        parser.add_argument(key,type=lambda s:Path(s).resolve())
    args=parser.parse_args()
    create(args.source,args.inputs,args.sound,args.behavior,args.output)
