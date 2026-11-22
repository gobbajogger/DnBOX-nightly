"""Run the tracked 26-state owner workflow with its supported Cutoff slot."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys

from PIL import Image

parser=argparse.ArgumentParser(description=__doc__)
for name in ('checkout','site','output'):
    parser.add_argument(name,type=lambda value:Path(value).resolve())
for name in ('commit','tree'):
    parser.add_argument('--'+name,required=True)
parser.add_argument('--resume',action='store_true')
args=parser.parse_args()


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git(*values):
    return subprocess.check_output(['git','-C',str(args.checkout),*values],text=True).strip()


def assert_source():
    assert (git('rev-parse','HEAD'),git('rev-parse','HEAD^{tree}'),git('status','--porcelain','--untracked-files=no'))==(
            args.commit,args.tree,'')
    for key in ('app.mjs','style.css','index.html'):
        assert sha(args.site/'remote'/key)==sha(args.checkout/'web/product-site/remote'/key),key


assert_source()
driver=args.checkout/'evidence/remote-owner-pages-20261121/owner-control-crosswalk/capture.py'
code=driver.read_text()
source_bits={'source':args.commit,'tree':args.tree,'driverSha256':sha(driver),
    'ownerWrapperSha256':sha(Path(__file__)),
    'styleSHA256':sha(args.site/'remote/style.css'),'indexSHA256':sha(args.site/'remote/index.html'),
    'referencePdfSHA256':sha(args.checkout/'docs/design/OWNER-BASELINE-1836.pdf'),
    'parameters':{'DPR':1,'hasTouch':True,'clock':'unfrozen','animations':'disabled at screenshot'}}
args.output.mkdir(parents=True,exist_ok=args.resume)
previous={}
inventory=args.output/'inventory.json.gz'
if args.resume:
    previous=json.loads(gzip.decompress(inventory.read_bytes()))
    for k,v in source_bits.items():assert previous[k]==v,k
    for key,data in previous['states'].items():
        assert sha(args.output/(key+'.png'))==data['screenshotSHA256'],key


def replace(old,new):
    global code
    assert code.count(old)==1,old
    code=code.replace(old,new)


midi="window.ownerMidiCalls=0;navigator.requestMIDIAccess=()=>{ownerMidiCalls++;throw Error('Unrequested MIDI');}"
replace('p=await ctx.new_page();p.set_default_timeout(30000)',
        'p=await ctx.new_page();p.set_default_timeout(30000);await p.add_init_script(OWNER_MIDI)')
replace("p.on('pageerror',lambda e:result['errors'].append(str(e)))",
        "result.update(SOURCE_BITS);result['states'].update(PREVIOUS.get('states',{}))\n    p.on('pageerror',lambda e:result['errors'].append(str(e)))")
replace("     await p.evaluate('document.fonts.ready')",
        "     if key in PREVIOUS.get('states',{}):return\n     await p.evaluate('document.fonts.ready')")
replace("     data['pages']=pages",
        """     data['pages']=pages
     data['observed']=await p.evaluate('''() => ({
      viewport:[innerWidth,innerHeight], body:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
      scroll:[scrollX,scrollY,document.body.scrollLeft,document.body.scrollTop],part:document.querySelector('#part').value,
      pattern:document.querySelector('#pattern-no').textContent, view:document.querySelector('main').dataset.layoutView,
      lane:document.querySelector('#lane-kind').value, tempo:document.querySelector('#tempo').textContent,
      clockEpochMs:Date.now(), midiCalls:ownerMidiCalls
     })''')
     assert data['observed']['viewport']==data['observed']['body'] and not any(data['observed']['scroll']) and not data['observed']['midiCalls'],(key,data['observed'])""")
cutoff_begin=code.index('    if a.owner_cutoff:\n')+len('    if a.owner_cutoff:\n')
cutoff_end=code.index('    elif a.break_journey:\n',cutoff_begin)
cutoff=code[cutoff_begin:cutoff_end].rstrip()
legacy_begin=code.index("     await part('chicago');await view('locks');await snap('03-motion',[3],")
legacy_end=code.index("     await view('sound');await p.locator('#sound-bank').select_option('CHICAGO');",legacy_begin)
legacy=code[legacy_begin:legacy_end]
dedicated="""     await part('chicago');await view('locks')
     main_page=p
     cutoff_context=await b.new_context(viewport={'width':1440,'height':900},has_touch=True,accept_downloads=True)
     try:
      p=await cutoff_context.new_page();p.set_default_timeout(30000)
      await p.add_init_script(OWNER_MIDI)
      p.on('pageerror',lambda error:result['errors'].append(str(error)))
      await p.goto(origin+'/remote/',wait_until='domcontentloaded')
      await p.wait_for_function("typeof document.querySelector('[data-engine]').onclick==='function' && document.getElementById('status').textContent.includes('Draft')")
"""
dedicated+='\n'.join(' '+line for line in cutoff.splitlines())+'\n'
dedicated+="""     finally:
      p=main_page
      await cutoff_context.close()
"""
replace(legacy,dedicated)
sys.argv=[str(driver),str(args.checkout),str(args.output),'--site',str(args.site)]
exec(compile(code,str(driver),'exec'),{'__name__':'__main__','__file__':str(driver),
     'SOURCE_BITS':source_bits,'PREVIOUS':previous,'OWNER_MIDI':midi})
assert_source()
result=json.loads(gzip.decompress(inventory.read_bytes()))
assert len(result['states'])==26 and {x for row in result['states'].values() for x in row['pages']}==set(range(1,24))
assert result['ownerCutoffDraftReadback']=={'catalogId':4098,'pattern':0,'values':[72]+[None]*15}
assert result['states']['03-motion']['ownerComparison']['state']=='KNOWN_CUTOFF_PARTIAL'
assert result['states']['17-motion']['ownerComparison']['state']=='UNKNOWN_STATE'
for name,row in result['states'].items():
    file=args.output/(name+'.png')
    assert sha(file)==row['screenshotSHA256'],name
    with Image.open(file) as image:
        assert list(image.size)==row['observed']['viewport'],name
        image.verify()
print('PASS 26 exact source-bound owner frames; only page3 supported Cutoff partial, page17 source state unknown',flush=True)
