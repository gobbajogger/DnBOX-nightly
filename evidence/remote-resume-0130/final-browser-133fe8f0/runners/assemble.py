"""Archive one freshly recovered candidate and compare its 26 owner states to the committed PDF."""
import argparse
import ast
import gzip
import hashlib
import io
import json
import subprocess
import tarfile
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

TOOLS = Path(__file__).resolve().parent
ROOT = next(path for path in TOOLS.parents if (path / '.git').exists() and (path / 'web/product-site').is_dir())
EVIDENCE = ROOT / 'evidence/remote-resume-0130/owner-review'
PDF = 'docs/design/OWNER-BASELINE-1836.pdf'
PDF_SHA = 'db826c9cbeb84971f2d030c847043a21749ad4172e30739773494df0c9acca17'
VIEWPORTS = [(1440,900),(1024,640),(844,390),(390,844)]
VIEWS = ('sequence','lane-chance','lane-pitch','lane-pan','sound','mix','patterns','files')
OWNER_KEYS = ('01-notes','02-steps','03-motion','04-chicago','05-miami','05-superj6','06-levels','07-master',
              '08-fx','09-patterns','10-song','11-generator','11-slices','12-projects','13-connect','13-review',
              '14-notes','15-steps','16-levels','17-motion','18-bassdrum','19-patterns','20-projects','21-notes',
              '22-gate','23-levels')
CONTEXT = {
    '01-notes': ('SUPERSEDED_LAYOUT','The prior inspector and mode row were replaced by modeless gestures and one thin lane.'),
    '03-motion': ('KNOWN_CUTOFF_PARTIAL','Chicago Cutoff / P01 / Step 01 raw72, current readout57%; superseded inspector remains a reference-only layout.'),
    '04-chicago': ('SUPERSEDED_CONTROLS','The prior raw duplicated fields and percent WAVE were superseded by source units and discrete waves.'),
    '05-miami': ('DUAL_ENGINE_REFERENCE','The reference combines Miami with an old generic Juno. The actual view selects one engine.'),
    '05-superj6': ('DUAL_ENGINE_REFERENCE','The old generic Juno and Miami drawing differs from the selected real SuperJ6.'),
    '06-levels': ('DIFFERENT_INPUT_AND_PROVIDER','Draft positions and per-part native peak, Mute and Solo require equivalent inputs and appropriate providers.'),
    '09-patterns': ('DIFFERENT_SELECTION','Reference shows P01 selected; the historical initial desktop fixture selects no target. Read the current receipt for its exact target.'),
    '10-song': ('DIFFERENT_ROW_COUNT','One actual authored row versus the depicted one active row and four future empty rows.'),
    '11-generator': ('NO_MATCHING_REFERENCE','The screenshot shows Generator. The PDF shows Slices with a Generator navigation action.'),
    '13-connect': ('COMBINED_REFERENCE','The PDF combines Connection with Draft Review and instrument state reads.'),
    '13-review': ('COMBINED_REFERENCE','The PDF review lists two Bass A note edits; the actual split workflow is separately captured.'),
    '14-notes': ('SUPERSEDED_LAYOUT','The old inspector, tool mode and row height differ from the approved touch-first modeless behavior.'),
    '16-levels': ('DIFFERENT_INPUT_AND_PROVIDER','The Draft Mode and true control availability differ; per-part native peak, Mute and Solo need separate providers.'),
    '17-motion': ('UNKNOWN_STATE','The drawing identifies old note timing details and reveals no lock identity or value. The actual MIAMI Motion route has different inputs.'),
    '18-bassdrum': ('DISTINCT_STOCK_PARAMETER','The pictured Accent gain and rendered kit Velocity use separate firmware identities.'),
    '21-notes': ('SUPERSEDED_LAYOUT','The old tool and selected-note inspector differ from the current one-lane layout.'),
    '22-gate': ('SUPERSEDED_INSPECTOR','The old Step Inspector was removed by the written correction. The actual Gate lane is the current workflow.'),
    '23-levels': ('REFERENCE_SELECTION_AND_PROVIDER_DIFFERENCE','The reference highlights Sequence on a Mix body. The actual Mix is selected; per-part telemetry/providers differ.'),
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def json_bytes(value):
    return (json.dumps(value,indent=2)+'\n').encode()


def git(*args):
    return subprocess.check_output(['git','-C',str(ROOT),*args])


def blob(commit, filename):
    return git('show',f'{commit}:{filename}')


def viewport(page):
    return (1440,900) if page<=13 else (844,390) if page<=20 else (390,844)


def manifest(commit, tree, site, captured):
    ref = json.loads((EVIDENCE/'995d549-reference-capture-inputs.json').read_bytes())
    names = [x.decode() for x in git('ls-tree','-r','-z','--name-only',commit,'web/product-site').split(b'\0') if x]
    files = {name:digest(blob(commit,name)) for name in sorted(names)}
    assert len(files)>=271 and 'web/product-site/remote/drum-clap-stages.mjs' in files
    manifest_rows = ''.join(f'{sha}  {name}\n' for name,sha in files.items()).encode()
    raw_manifest = json.loads(blob(commit,'web/product-site/SOURCE-MANIFEST.json'))
    assert all('web/product-site/'+item['path'] in files for item in raw_manifest['files'])
    runtime_paths = [
       ('currentEmulator','scripts/emulator-runtime-pin.json','emu/'),
       ('predecessorEmulator','scripts/firmware-emulator/previous-runtime.json','emu/previous/'),
       ('firmwareReference','scripts/firmware-reference-pin.json','reference/screens/'),
    ]
    runtimes={}
    for role,pin_path,prefix in runtime_paths:
        pin_bytes=blob(commit,pin_path); pin=json.loads(pin_bytes)
        assets={prefix+name: spec for name,spec in pin['files'].items()}
        for name,spec in assets.items():
            got=(site/name).read_bytes()
            assert (len(got),digest(got))==(spec['bytes'],spec['sha256']),name
        runtimes[role]={'pin':pin_path,'pinSHA256':digest(pin_bytes),'firmwareCommit':pin['firmware'],
                        'kernelCommit':pin.get('kernel'),'files':assets}
    closure=ref['selectedAssets']
    supplemental=('scripts/build-product-site.mjs','scripts/emulator-runtime.mjs','scripts/firmware-reference-runtime.mjs',
                  'tests/firmware-reference/native-rgb.tsv','tests/visual/grid_continuity.py')
    assets={name:digest(blob(commit,name)) for name in sorted(set(closure)|set(supplemental))}
    built={path.relative_to(site).as_posix():digest(path.read_bytes()) for path in sorted(site.rglob('*')) if path.is_file()}
    for name,sha in files.items():
        if name.startswith('web/product-site/remote/'):
            rel=name.removeprefix('web/product-site/')
            if rel in built: assert built[rel]==sha,name
    frozen=dict(ref['freeze'])
    definition={'FREEZE_JS':'javascriptSHA256','FREEZE_CSS':'cssSHA256'}
    actual={}
    for node in ast.parse(blob(commit,'tests/visual/visual_gate.py')).body:
        if isinstance(node,ast.Assign) and isinstance(node.targets[0],ast.Name) and node.targets[0].id in definition:
            actual[definition[node.targets[0].id]]=digest(ast.literal_eval(node.value).encode())
    assert len(actual)==2 and all(frozen[k]==v for k,v in actual.items())
    frozen['colorProfileFlag']='--force-color-profile=srgb'
    declared=captured['clockInputs']
    for pin,setting in [('javascriptSHA256','freezeJS'),('cssSHA256','freezeCSS'),
                        ('clockEpochMs','epochMs'),('deviceScaleFactor','DPR')]:
        assert frozen[pin]==declared[setting],pin
    for setting in ('randomSeed','locale','timezone','motion'):
        assert frozen[setting]==declared[setting],setting
    assert declared['flags']==[*frozen['fontRenderFlags'],frozen['colorProfileFlag']]
    assert all(built['remote/'+name]==value for name,value in captured['builtRemoteSHA256'].items())
    for field,asset in [('productAppSHA256','remote/app.mjs'),('productStyleSHA256','remote/style.css')]:
        if field in captured:assert captured[field]==built[asset],asset
    return {'source':commit,'tree':tree,'viewportSizes':[list(v) for v in VIEWPORTS],'states':VIEWS,
            'sourceClosure':{'files':len(files),'sortedManifestSHA256':digest(manifest_rows),'perFileSHA256':files},
            'builtSiteClosure':{'files':len(built),'sortedManifestSHA256':digest(''.join(f'{h}  {n}\n' for n,h in built.items()).encode()),'perFileSHA256':built},
            'runtime':runtimes,'criticalAssetsSHA256':assets,'freeze':frozen,'declaredCaptureFreeze':declared,
            'historicalProposalComparison':'NOT_RECOVERED','approvedRegisteredBaselines':0,'registeredBaselineStatus':'NOBASE'},manifest_rows


def png_data(path, expected, expected_sha):
    content=path.read_bytes()
    assert digest(content)==expected_sha,path
    with Image.open(io.BytesIO(content)) as image:
        assert image.size==expected and image.format=='PNG',(path,image.size,expected)
        image.verify()
    return content


def pair(original, actual, expected):
    with Image.open(io.BytesIO(original)) as source,Image.open(io.BytesIO(actual)) as capture:
        left,right=source.convert('RGB'),capture.convert('RGB')
    assert left.size==right.size==expected
    channel_delta=np.max(np.abs(np.asarray(left,dtype=np.int16)-np.asarray(right,dtype=np.int16)),axis=2)
    pixels=channel_delta.size
    count=int((channel_delta>25.5).sum())
    joined=Image.new('RGB',(expected[0]*2,expected[1])); joined.paste(left,(0,0)); joined.paste(right,(expected[0],0))
    buffer=io.BytesIO(); joined.save(buffer,format='PNG'); data=buffer.getvalue()
    return data,{'originalSHA256':digest(original),'actualSHA256':digest(actual),'pairSHA256':digest(data),'nativeSize':expected,
                 'tolerantDifferentPixels':count,'exactDifferentPixels':int((channel_delta>0).sum()),
                 'tolerantDifferentPercent':round(100*count/pixels,4),'atMostTwoPercentByMetric':count/pixels<=.02}


def add(archive,name,data):
    item=tarfile.TarInfo(name); item.size=len(data); item.mode=0o644; archive.addfile(item,io.BytesIO(data))


def pack(path,entries,images):
    pending=path.with_name(path.name+'.pending')
    assert not path.exists()
    with tarfile.open(pending,'x:gz',compresslevel=6) as out:
        for name,data in entries.items():add(out,name,data)
    with tarfile.open(pending,'r:gz') as archive:
        assert {item.name for item in archive.getmembers() if item.name.endswith('.png')}==images.keys()
        for name,(expected_hash,dimensions) in images.items():
            data=archive.extractfile(name).read()
            assert digest(data)==expected_hash,name
            with Image.open(io.BytesIO(data)) as image:
                assert image.size==dimensions,name
                image.verify()
    pending.rename(path)
    return {'filename':path.name,'bytes':path.stat().st_size,'sha256':digest(path.read_bytes())}


def capture_source(receipt):
    return receipt.get('source',receipt.get('capturedAtCommit'))


def source_tree(receipt):
    return receipt.get('tree',receipt.get('sourceTree'))


def basename(value):
    assert isinstance(value,str) and Path(value).name==value,value
    return value


def assemble(commit,owner_dir,registered_dir,site,out):
    tree=git('rev-parse',commit+'^{tree}').decode().strip()
    assert git('rev-parse',commit+'^{commit}').decode().strip()==commit
    owner_receipt_bytes=(owner_dir/'inventory.json.gz').read_bytes()
    owner=json.loads(gzip.decompress(owner_receipt_bytes))
    registered_receipt_bytes=(registered_dir/'inventory.json').read_bytes()
    registered=json.loads(registered_receipt_bytes)
    assert capture_source(owner)==capture_source(registered)==commit
    assert source_tree(owner)==source_tree(registered)==tree
    assert not owner.get('errors') and not registered.get('errors') and not registered.get('pageErrors')
    assert set(owner['states'])==set(OWNER_KEYS)
    expected_keys={f'remote-{view}-{w}x{h}':(w,h) for w,h in VIEWPORTS for view in VIEWS}
    assert registered['states'].keys()==expected_keys.keys()
    inputs,rows=manifest(commit,tree,site,registered)
    served=inputs['builtSiteClosure']['perFileSHA256']
    for field,asset in [('appSHA256','app.mjs'),('styleSHA256','style.css'),('indexSHA256','index.html')]:
        assert owner[field]==served['remote/'+asset],asset
    assert owner['referencePdfSHA256']==PDF_SHA
    owner_browser=owner['browser'].removeprefix('Chromium ')
    registered_browser=registered.get('browser',registered.get('chromium'))
    assert registered_browser and owner_browser==registered_browser.removeprefix('Chromium ')
    inputs['chromium']=owner_browser
    pdf=blob(commit,PDF)
    assert digest(pdf)==PDF_SHA
    pdf_version=subprocess.run(['pdftoppm','-v'],capture_output=True,check=True,text=True).stderr.splitlines()[0]
    out.mkdir(parents=True,exist_ok=True)
    key=commit[:12]; prefix=f'lane-remote-resume-0130-{key}'
    orig_name=f'{key}-reference-capture-inputs.json'; manifest_name=f'{key}-product-source-sha256.txt'
    base={'source':commit,'tree':tree,'comparisonInputsSHA256':digest(json_bytes(inputs)),
          'chromium':owner_browser,'ownerPDFSHA256':PDF_SHA,'poppler':pdf_version,
          'historicalProposalComparison':'NOT_RECOVERED','registeredBaselineStatus':'NOBASE','newCapturedStates':{'owner':26,'registered':32}}
    owner_index={}
    owner_pngs={}
    pair_entries={}
    with tempfile.TemporaryDirectory(prefix='owner-original-',dir=out) as raw_temp:
        ref=Path(raw_temp);pdf_on_disk=ref/'owner.pdf';pdf_on_disk.write_bytes(pdf)
        subprocess.run(['pdftoppm','-f','1','-l','23','-r','72','-png',str(pdf_on_disk),str(ref/'page')],check=True)
        for name in OWNER_KEYS:
            shot=owner['states'][name]; page=int(name[:2]); expected=viewport(page)
            assert shot['pages']==[page] and shot['bodyWidth']==expected[0],name
            observed=shot['observed']
            assert tuple(observed['viewport'])==tuple(observed['body'])==expected and not any(observed['scroll']) and observed['midiCalls']==0,name
            raw_name=basename(shot.get('filename',f'{name}.png'))
            data=png_data(owner_dir/raw_name,expected,shot['screenshotSHA256'])
            ref_bytes=(ref/f'page-{page:02d}.png').read_bytes()
            paired,metric=pair(ref_bytes,data,expected)
            scope,explain=CONTEXT.get(name,('DIAGNOSTIC','Actual source and documented inputs are retained for independent approval.'))
            classification={'state':scope,'reason':explain}
            if name in CONTEXT:classification['pixelAcceptanceEligible']=False
            if name in ('03-motion','17-motion'):
                assert shot['ownerComparison']['state']==scope and not shot['ownerComparison']['pixelAcceptanceEligible'],name
                classification=shot['ownerComparison']
            member=f'owner-pairs/owner-{name}.png'; pair_entries[member]=paired
            owner_index[name]={'page':page,'captureSource':commit,'rawFilename':raw_name,**metric,'ownerComparison':classification,'observed':observed}
            owner_pngs[member]=(metric['pairSHA256'],(2*expected[0],expected[1]))
    assert owner['ownerCutoffDraftReadback']=={'catalogId':4098,'pattern':0,'values':[72]+[None]*15}
    owner_report={**base,'pages':23,'states':owner_index,
                  'pixelThresholdRGB':25.5,'within2PercentUnmasked':sum(v['atMostTwoPercentByMetric'] for v in owner_index.values()),
                  'comparisonScope':'Diagnostic full-image against committed PDF. Known superseded, unknown and alternate state flags remain attached.'}
    pair_entries.update({'owner-pairs/metrics.json':json_bytes(owner_report),'source/owner-capture-inventory.json.gz':owner_receipt_bytes,
                         'owner-comparison-context.md':(TOOLS/'owner-comparison-context.md').read_bytes(),orig_name:json_bytes(inputs)})
    registered_pngs={}
    registered_index={}
    actual_entries={}
    for name,expected in expected_keys.items():
        shot=registered['states'][name]
        png_name=basename(shot.get('filename',f'{name}.png'))
        data=png_data(registered_dir/png_name,expected,shot['sha256'])
        assert tuple(shot['viewport'])==tuple(shot['body'])==expected and not any(shot['scroll']) and shot['midiCalls']==0,name
        assert shot['part']=='chicago' and shot['tempo']=='120 BPM' and shot['pattern']=='P01',name
        assert shot['clock']==inputs['freeze']['clockEpochMs'],name
        route=name.removeprefix('remote-').rsplit('-',1)[0]
        if route=='sequence' or route.startswith('lane-'):
            # Startup roll precedes an explicit view selection in the frozen fixture.
            assert shot['view'] in (None,'','roll'),name
            assert shot['lane']==(route.removeprefix('lane-') if route.startswith('lane-') else 'velocity'),name
        else:
            assert shot['view']==route,name
        member=f'actual/{name}.png'; actual_entries[member]=data
        registered_index[name]={'captureSource':commit,'viewport':expected,'sha256':shot['sha256'],'filename':png_name,
                                'comparison':'NOT_RECOVERED','requestedRoute':route,'observedLayoutView':shot['view'],
                                'lane':shot['lane'],'captureMethod':shot['capture']}
        registered_pngs[member]=(shot['sha256'],expected)
    registered_report={**base,'states':registered_index,'approvedBaselines':0,'baselineStatus':'NOBASE',
                       'historicalProposalComparison':'NOT_RECOVERED','scope':'32 actual candidate screenshots at four registered sizes.'}
    actual_entries.update({'actual/inventory.json':json_bytes(registered_report),'source/registered-capture-inventory.json':registered_receipt_bytes,
                           orig_name:json_bytes(inputs),manifest_name:rows})
    archives=[pack(out/f'{prefix}-owner-pdf-pairs.tar.gz',pair_entries,owner_pngs),
              pack(out/f'{prefix}-registered-32.tar.gz',actual_entries,registered_pngs)]
    index={**base,'archives':archives,'sourceFiles':inputs['sourceClosure']['files'],'builtFiles':inputs['builtSiteClosure']['files'],
           'runtimeFilesVerified':sum(len(v['files']) for v in inputs['runtime'].values()),'verifiedPNGMembers':len(owner_pngs)+len(registered_pngs),
           'ownerWholeImagesWithin2Percent':owner_report['within2PercentUnmasked'],'ownerPairSources':owner_index,
           'registeredCaptureSources':registered_index}
    (out/f'{commit[:8]}-visual-delivery.json').write_bytes(json_bytes(index))
    (out/orig_name).write_bytes(json_bytes(inputs))
    (out/manifest_name).write_bytes(rows)
    print(json.dumps({name:value for name,value in index.items() if not name.endswith('Sources')},indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('commit')
    for name in ('owner_dir','registered_dir','product_site','output'):
        parser.add_argument(name,type=lambda p:Path(p).resolve())
    args=parser.parse_args()
    assemble(args.commit,args.owner_dir,args.registered_dir,args.product_site,args.output)
