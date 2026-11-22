"""Replace the narrowly corrected owner states and keep every other PNG unchanged."""
import argparse
import copy
import gzip
import io
import json
import runpy
import subprocess
import tarfile
import tempfile
from pathlib import Path

from PIL import Image

TOOLS=Path(__file__).resolve().parent
BASE=runpy.run_path(str(TOOLS/'assemble.py'))
TARGETS={
 '06-levels':('chicago','mix','Bass A matches. The original raw faders and native per-part peak/Mute/Solo remain unresolved.'),
 '07-master':('chicago','mix','Bass A matches. The exact source role controls are used and owner raw master settings remain unspecified.'),
 '08-fx':('chicago','mix','Bass A matches. The exact source role controls are used and owner raw FX values/phase remain unspecified.'),
 '09-patterns':('chicago','patterns','Local Bass A P01 selection matches. The pictured native queue/copy/paste/clear/chain provider is open.'),
 '12-projects':('chicago','files','Bass A matches and the one authored Song row is preserved. The drawing does not specify the whole Draft.'),
 '16-levels':('chicago','mix','Bass A and idle connection status match. Owner raw faders and native telemetry remain unresolved.'),
}


def read_json(path):
    data=path.read_bytes()
    return json.loads(gzip.decompress(data) if path.suffix=='.gz' else data)


def member_bytes(archive,name):
    return archive.extractfile(name).read()


def update(commit, previous_dir, retake_dir, output):
    write=BASE['json_bytes']; sha=BASE['digest']; short=commit[:12]
    prefix=f'lane-remote-resume-0130-{short}'
    index=read_json(previous_dir/f'{commit[:8]}-visual-delivery.json')
    src=previous_dir/f'{prefix}-owner-pdf-pairs.tar.gz'
    original_archive=next(row for row in index['archives'] if row['filename']==src.name)
    assert sha(src.read_bytes())==original_archive['sha256']
    candidates=[retake_dir/rev for rev in ('inventory.json.gz','inventory.json','receipt.json') if (retake_dir/rev).is_file()]
    assert len(candidates)==1,candidates
    retake_path=candidates[0]; retake=read_json(retake_path)
    assert BASE['capture_source'](retake)==index['source']==commit
    assert BASE['source_tree'](retake)==index['tree']
    assert retake['result']=='PASS' and not retake.get('errors') and not retake.get('pageErrors')
    inputs=read_json(previous_dir/f'{short}-reference-capture-inputs.json')
    assert retake['browser']==inputs['chromium']
    assert all(inputs['builtSiteClosure']['perFileSHA256']['remote/'+key]==value for key,value in retake['builtRemoteSHA256'].items())
    assert set(retake['states'])==TARGETS.keys(),retake['states'].keys()
    output.mkdir(parents=True,exist_ok=True)
    with tarfile.open(src,'r:gz') as archive, tempfile.TemporaryDirectory(prefix='fresh-owner-pages-',dir=output) as temp:
        entries={item.name:member_bytes(archive,item.name) for item in archive.getmembers() if item.isfile()}
        metrics=json.loads(entries['owner-pairs/metrics.json'])
        prior_receipt=entries['source/owner-capture-inventory.json.gz']
        assert sha(prior_receipt)==retake['originalInventorySHA256']
        raw_owner=json.loads(gzip.decompress(prior_receipt))
        corrected=retake['states']
        for name,total in [('06-levels',21),('07-master',16),('08-fx',35)]:
            assert len(corrected[name]['sameGlobalControlValuesAcrossPartSwitch'])==total,name
        assert corrected['16-levels']['sameGlobalControlValuesAs06']==corrected['06-levels']['sameGlobalControlValuesAcrossPartSwitch']
        assert corrected['09-patterns']['localSelection']['pattern']=='P01' and not corrected['09-patterns']['localSelection']['loaded']
        assert corrected['09-patterns']['draftReadback']['launch']==[None,None,0,None,None]
        assert corrected['12-projects']['draftReadback']['song']==[{'patterns':[0]*5,'repeats':1}]
        assert corrected['16-levels']['observed']['connection']=='Not connected' and corrected['16-levels']['draftReadback']['parameters']==[]
        refs=Path(temp); pdf=refs/'owner.pdf'; pdf.write_bytes(BASE['blob'](commit,BASE['PDF']))
        assert sha(pdf.read_bytes())==index['ownerPDFSHA256']
        for name,(owner,route,remainder) in TARGETS.items():
            now=retake['states'][name]; before=metrics['states'][name]; page=before['page']; size=tuple(before['nativeSize'])
            observed=now.get('observed',now)
            assert now['previousRejectedFixture']['screenshotSHA256']==before['actualSHA256'],name
            assert observed['part']==observed['selectedPart']==owner and observed['view']==route,name
            assert tuple(observed['viewport'])==tuple(observed['body'])==size and not any(observed['scroll']) and observed['midiCalls']==0,name
            png_digest=now.get('screenshotSHA256',now.get('sha256')); filename=BASE['basename'](now.get('filename',name+'.png'))
            png=BASE['png_data'](retake_dir/filename,size,png_digest)
            subprocess.run(['pdftoppm','-f',str(page),'-l',str(page),'-r','72','-png',str(pdf),str(refs/'page')],check=True)
            original=(refs/f'page-{page:02d}.png').read_bytes()
            assert sha(original)==before['originalSHA256'],name
            paired,metric=BASE['pair'](original,png,size)
            entries[f'owner-pairs/owner-{name}.png']=paired
            metrics['states'][name]={'page':page,'captureSource':commit,'rawFilename':filename,**metric,'observed':observed,
                'supersedesCaptureSHA256':before['actualSHA256'],
                'ownerComparison':{'state':'KNOWN_SELECTION_MATCH_DIAGNOSTIC','reason':remainder,'pixelAcceptanceEligible':False}}
        for name,frame in metrics['states'].items():
            if name in TARGETS:
                continue
            assert frame['pairSHA256']==index['ownerPairSources'][name]['pairSHA256'],name
            if name in ('13-connect','13-review'):
                frame['ownerComparison']['knownSelectedPartDifference']='The combined drawing selects Bass A; the separate actual capture retains BREAK.'
            visible=raw_owner['states'][name]['visibleText']
            visible=' '.join(visible) if isinstance(visible,list) else str(visible)
            if 'No reviewed firmware catalog' in visible and int(name[:2])>=14:
                frame['ownerComparison']['knownConnectionStatusDifference']='Actual post-Connect catalog status differs from idle Not connected on the drawing.'
                frame['ownerComparison']['pixelAcceptanceEligible']=False
        metrics['knownStateCorrections']=sorted(TARGETS)
        metrics['within2PercentUnmasked']=sum(row['atMostTwoPercentByMetric'] for row in metrics['states'].values())
        entries['owner-pairs/metrics.json']=write(metrics)
        key=f'source/targeted-owner-state-{retake_path.name}'
        entries[key]=retake_path.read_bytes()
        entries['owner-comparison-context.md']+=(
            '\nA targeted same-source refresh corrects the selected Bass A part on pages 6, 7, 8, 12 and 16 and the local P01 selection on page 9. '
            'The receipt retains both actual capture hashes. Raw values omitted by the PDF remain unknown. Other state discrepancies stay visible in the per-pair index.\n').encode()
        expected={f'owner-pairs/owner-{name}.png':(data['pairSHA256'],(2*data['nativeSize'][0],data['nativeSize'][1])) for name,data in metrics['states'].items()}
    pin=BASE['pack'](output/src.name,entries,expected)
    registered_location=previous_dir/f'{prefix}-registered-32.tar.gz'
    registered_pin=next(row for row in index['archives'] if row['filename']==registered_location.name)
    assert sha(registered_location.read_bytes())==registered_pin['sha256']
    sound=read_json(output/f'{commit[:8]}-sound-delivery.json')
    assert sound['source']==commit and sound['tree']==index['tree'] and sound['changedSoundFrames']==20
    assert sound['referenceInputsSHA256']==sha((previous_dir/f'{short}-reference-capture-inputs.json').read_bytes())
    sound_location=output/sound['archive']['filename']; assert sha(sound_location.read_bytes())==sound['archive']['sha256']
    index['archives']=[pin,registered_pin,sound['archive']]
    index['verifiedPNGMembers']=len(expected)+32+sound['changedSoundFrames']
    index['changedSoundFrames']=sound['changedSoundFrames']
    index['soundCaptureSources']=sound['states']
    index['ownerApproval']='PENDING_MATCHED_OWNER_REFERENCES'
    index['ownerMetricScope']='Unmasked pixel distance for diagnostic pairs. Inspect each ownerComparison classification for known context and eligibility.'
    index['ownerPairSources']=metrics['states']
    index['ownerWholeImagesWithin2Percent']=metrics['within2PercentUnmasked']
    index['targetedOwnerSelectionCorrections']=sorted(TARGETS)
    index['archiveLocations']={'owner':str(output/src.name),'registered':str(registered_location),'sound':str(sound_location)}
    index['targetedOwnerReceiptSHA256']=sha(retake_path.read_bytes())
    (output/f'{commit[:8]}-visual-delivery.json').write_bytes(write(index))
    locals={'archives':index['archives'],'locations':index['archiveLocations'],'ownerPairsVerified':len(expected),
            'allRegisteredPNGsPreviouslyVerified':32,'soundPNGsPreviouslyVerified':20,'within2PercentUnmasked':index['ownerWholeImagesWithin2Percent'],
            'correctedInputs':{name:metrics['states'][name]['tolerantDifferentPercent'] for name in TARGETS}}
    print(json.dumps(locals,indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('commit')
    for name in ('previous','retakes','output'):
        parser.add_argument(name,type=lambda p:Path(p).resolve())
    args=parser.parse_args()
    update(args.commit,args.previous,args.retakes,args.output)
