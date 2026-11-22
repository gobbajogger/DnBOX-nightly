"""Independently hash the retained exact-source browser evidence, without a browser."""
from datetime import datetime, timezone
from pathlib import Path
import gzip
import hashlib
import json
import subprocess
import sys

from PIL import Image

run,checkout=map(lambda path:Path(path).resolve(),sys.argv[1:3])
source=sys.argv[3]
tree=sys.argv[4]
site=checkout/'.output/site'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path):
    return json.loads(path.read_text())


def git(*args):
    return subprocess.check_output(['git','-C',str(checkout),*args],text=True).strip()


assert (git('rev-parse','HEAD'),git('rev-parse','HEAD^{tree}'),git('status','--porcelain','--untracked-files=no'))==(source,tree,'')
exit_rows=(run/'results.tsv').read_text().splitlines()
exits={step:{'exit':int(code),'startedUTC':began,'finishedUTC':finished}
       for step,code,began,finished in (row.split('\t') for row in exit_rows[1:])}
for phase,details in exits.items():
    retry=run/'logs'/f'{phase}-resume.exit'
    if retry.exists():details['resumeExit']=int(retry.read_text())
    assert details.get('resumeExit',details['exit'])==0,(phase,details)
assert set(exits)=={'build','registered','owner','sound','behavior'}
registered=load(run/'registered/inventory.json')
sound=load(run/'sound/inventory.json')
behavior=load(run/'behavior/inventory.json')
owner=json.loads(gzip.decompress((run/'owner/inventory.json.gz').read_bytes()))
inventories={'registered':registered,'owner':owner,'sound':sound,'behavior':behavior}
chromium='151.0.7922.34'
for phase,info in inventories.items():
    assert (info['source'],info['tree'])==(source,tree),phase
    assert not info['errors'],(phase,info['errors'])
    assert (info.get('chromium') or info['browser'])==chromium,phase
    assert (info.get('productAppSHA256') or info['appSHA256'])==sha(site/'remote/app.mjs'),phase
    if phase!='owner':assert info['result']=='PASS',info['result']
assert registered['builtRemoteSHA256']==sound['builtRemoteSHA256']==behavior['builtRemoteSHA256']
assert owner['styleSHA256']==registered['builtRemoteSHA256']['style.css']
assert owner['referencePdfSHA256']=='db826c9cbeb84971f2d030c847043a21749ad4172e30739773494df0c9acca17'
assert owner['ownerCutoffDraftReadback']=={'catalogId':4098,'pattern':0,'values':[72]+[None]*15}
assert owner['states']['03-motion']['ownerComparison']['state']=='KNOWN_CUTOFF_PARTIAL'
assert not owner['states']['03-motion']['ownerComparison']['pixelAcceptanceEligible']
assert owner['states']['17-motion']['ownerComparison']['state']=='UNKNOWN_STATE'
assert not owner['states']['17-motion']['ownerComparison']['pixelAcceptanceEligible']
frames={}
for group,count in (('registered',32),('owner',26),('sound',20)):
    rows=inventories[group]['states']
    assert len(rows)==count,(group,len(rows))
    frames[group]={}
    for name,state in rows.items():
        if group=='owner':
            observed=state['observed']
            filename=name+'.png'
            digest=state['screenshotSHA256']
            script=inventories[group]['ownerWrapperSha256']
        else:
            observed=state
            filename=state['filename']
            digest=state['sha256']
            script=state['captureScriptSHA256']
        assert observed['body']==observed['viewport'] and not any(observed['scroll']),name
        assert observed['midiCalls']==0 and observed['tempo']=='120 BPM',name
        file=run/group/filename
        assert sha(file)==digest,name
        with Image.open(file) as img:
            assert img.format=='PNG' and list(img.size)==observed['viewport'],name
            img.verify()
        frames[group][name]={'file':file.relative_to(run).as_posix(),'sha256':digest,'viewport':observed['viewport'],
                             'bytes':file.stat().st_size,'captureScriptSHA256':script}
        if group=='owner' and 'ownerComparison' in state:
            frames[group][name]['ownerComparison']=state['ownerComparison']
expected_files={row['file'] for entries in frames.values() for row in entries.values()}
assert len(expected_files)==78 and expected_files=={p.relative_to(run).as_posix() for group in frames for p in (run/group).glob('*.png')}
observed_lanes={'sequence':'velocity','lane-chance':'chance','lane-pitch':'pitch','lane-pan':'pan'}
for size in ('1440x900','1024x640','844x390','390x844'):
    for view,lane in observed_lanes.items():
        row=registered['states'][f'remote-{view}-{size}']
        assert row['lane']==lane and row['clock']==1794790800000 and row['part']=='chicago' and row['pattern']=='P01',row
    report=behavior['behaviors'][size]
    assert len(report['sourceBanks'])==4 and len(report['breakSlices'])==2 and len(report['masterMore'])==12 and report['midiCalls']==0,report
    assert sum(len(row['coupled']) for row in report['sourceBanks'].values())==10,report
manifest={
    'source':source,'tree':tree,'chromium':chromium,'verifiedUTC':datetime.now(timezone.utc).isoformat(),
    'scope':'Software-only changed-control browser proof and each current Remote candidate raw set',
    'registeredHistoricalProposalStatus':'NOT_RECOVERED',
    'ownerReferencePdfSHA256':owner['referencePdfSHA256'],'phaseResults':exits,
    'counts':{group:len(entries) for group,entries in frames.items()},'frames':frames,
    'ownerCutoffDraftReadback':owner['ownerCutoffDraftReadback'],
    'builtRemoteSHA256':registered['builtRemoteSHA256'],'runtimeInputsSHA256':sha(run/'runtime-files.sha256'),
    'behaviorCounts':{'viewports':4,'bankOwnershipCasesPerViewport':4,'coupledEditsPerViewport':10,
                      'breakSliceSelectorsPerViewport':2,'masterMoreControlsPerViewport':12},
    'receiptsSHA256':{name:sha(run/name) for name in ('registered/inventory.json','owner/inventory.json.gz','sound/inventory.json',
                       'behavior/inventory.json','source.txt','source-after.txt','results.tsv')},
}
output=run/'artifact-manifest.json'
output.write_text(json.dumps(manifest,indent=2)+'\n')
print('Verified',manifest['counts'],manifest['behaviorCounts'])
print(sha(output),output)
