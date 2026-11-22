"""Collect one exact published Remote candidate and verify the changed Draft controls."""
from __future__ import annotations
import argparse
import asyncio
import hashlib
import importlib.util
import json
from pathlib import Path
import runpy
import subprocess
import sys
import traceback

from PIL import Image
from playwright.async_api import async_playwright, expect

SIZES=((1440,900),(1024,640),(844,390),(390,844))
FLAGS=['--font-render-hinting=none','--disable-lcd-text','--force-color-profile=srgb']
SOUND=(('chicago','CHICAGO',0),('chicago','MIAMI',0),('miami','CHICAGO',1),('miami','MIAMI',1),('breaks','BREAK',-1))
MIDI="window.midiCalls=0;navigator.requestMIDIAccess=()=>{midiCalls++;throw Error('Unrequested MIDI');};"
DOM="""() => ({
 viewport:[innerWidth,innerHeight],body:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
 scroll:[scrollX,scrollY,document.body.scrollLeft,document.body.scrollTop],part:document.querySelector('#part').value,
 view:document.querySelector('main').dataset.layoutView,lane:document.querySelector('#lane-kind').value,
 title:document.querySelector('#part-title').textContent,pattern:document.querySelector('#pattern-no').textContent,
 tempo:document.querySelector('#tempo').textContent,connection:document.querySelector('#conn-state').textContent,
 status:document.querySelector('#status').textContent,clock:Date.now(),midiCalls
})"""


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_module(path,name):
    spec=importlib.util.spec_from_file_location(name,path)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def source_id(bank,voice,p):
    return f'source-sound/{bank}/{voice}|1:2:{voice}:{p}:{int(bank=="MIAMI")}'


class Runner:
    def __init__(self,args):
        self.args=args
        self.root,self.site,self.out=args.checkout,args.site,args.output
        root=self.root
        self.assert_source()
        self.phase=args.phase
        self.helper=root/'tests/product-remote'
        self.server=runpy.run_path(str(self.helper/'envelope-browser.py'))['server']
        self.core=load_module(self.helper/'funkybeats-browser.py','candidate_core')
        self.core.SOURCE=self.site
        self.native=load_module(self.helper/'native-sound-browser.py','candidate_native')
        self.master=load_module(self.helper/'master-more-browser.py','candidate_master')
        sys.path.insert(0,str(root/'tests/visual'))
        self.visual=runpy.run_path(str(root/'tests/visual/visual_gate.py'))
        self.out.mkdir(parents=True,exist_ok=args.resume)
        self.file=self.out/'inventory.json'
        self.data={'source':args.commit,'tree':args.tree,'phase':self.phase,'captureScriptSHA256':sha(Path(__file__)),
                   'productAppSHA256':sha(self.site/'remote/app.mjs'),'states':{},'behaviors':{},'errors':[],
                   'baselineState':'NOT_RECOVERED (unapproved historical 32 proposal reference files)',
                   'builtRemoteSHA256':{}}
        for path in sorted((self.site/'remote').rglob('*')):
            if path.is_file():
                name=path.relative_to(self.site/'remote').as_posix()
                self.data['builtRemoteSHA256'][name]=sha(path)
        for name in ('app.mjs','index.html','style.css','source-sound-glyphs.mjs','break-slice-glyph.mjs',
                     'master-draft.mjs','glyph-live.mjs','glyph-render.mjs'):
            assert self.data['builtRemoteSHA256'][name]==sha(root/'web/product-site/remote'/name),name
        if args.resume:
            old=json.loads(self.file.read_text())
            for key in ('source','tree','phase','builtRemoteSHA256'):
                assert old[key]==self.data[key],key
            for state in old['states'].values():
                assert sha(self.out/state['filename'])==state['sha256'],state['filename']
                state.setdefault('captureScriptSHA256',old['captureScriptSHA256'])
            for key in ('states','behaviors'):
                self.data[key]=old[key]
            self.data['earlierErrors']=old.get('earlierErrors',[])+old['errors']

    def assert_source(self):
        def git(*args):
            return subprocess.check_output(['git','-C',str(self.root),*args],text=True).strip()
        assert (git('rev-parse','HEAD'),git('rev-parse','HEAD^{tree}'),git('status','--porcelain','--untracked-files=no'))==(
            self.args.commit,self.args.tree,'')

    def save(self):
        tmp=self.file.with_suffix('.tmp')
        tmp.write_text(json.dumps(self.data,indent=2)+'\n')
        tmp.replace(self.file)

    async def new_page(self,context):
        page=await context.new_page()
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        await page.add_init_script(MIDI)
        return page,errors

    async def ready(self,page,url):
        await page.goto(url)
        await expect(page.locator('main')).to_have_attribute('aria-busy','false')
        await page.evaluate('document.fonts.ready')

    async def snap(self,page,key,method,errors,**shot):
        state=await page.evaluate(DOM)
        assert state['body']==state['viewport'] and not any(state['scroll']) and not state['midiCalls'] and not errors,state
        assert state['tempo']=='120 BPM',state
        path=self.out/(key+'.png')
        image=await page.screenshot(path=path,**shot)
        with Image.open(path) as png:
            assert list(png.size)==state['viewport'],(key,png.size)
            png.verify()
        state.update(filename=path.name,sha256=hashlib.sha256(image).hexdigest(),capture=method,
                     captureScriptSHA256=self.data['captureScriptSHA256'])
        self.data['states'][key]=state
        self.save()
        print('PASS',key,state['view'],state['part'],flush=True)

    async def registered(self,browser,width,height,origin):
        context=await browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,
              has_touch=width<900,reduced_motion='reduce',locale='en-US',timezone_id='UTC')
        try:
            await context.add_init_script(self.visual['FREEZE_JS'])
            for view in ('sequence','lane-chance','lane-pitch','lane-pan','sound','mix','patterns','files'):
                key=f'remote-{view}-{width}x{height}'
                if key in self.data['states']:continue
                page,errors=await self.new_page(context)
                try:
                    await self.ready(page,origin+'/remote/index.html')
                    await page.add_style_tag(content=self.visual['FREEZE_CSS'])
                    await page.wait_for_load_state('networkidle')
                    await page.wait_for_timeout(250)
                    if view.startswith('lane-'):
                        for _ in range(('lane-chance','lane-pitch','lane-pan').index(view)+1):
                            await page.locator('#lane-param').click()
                    elif view!='sequence':
                        await page.locator(f'[data-view="{view}"]').click()
                    if view!='sequence':await page.wait_for_timeout(150)
                    await self.snap(page,key,'Fresh registered candidate, frozen clock and random seed',errors)
                finally:
                    await page.close()
        finally:
            await context.close()

    async def sound(self,browser,width,height):
        context=await browser.new_context(viewport={'width':width,'height':height},has_touch=width<900)
        try:
            await context.route('**/*',self.core.serve)
            for part,bank,voice in SOUND:
                key=f'{width}x{height}-'+(part if voice==-1 else part+'-'+bank.lower())
                if key in self.data['states']:continue
                page,errors=await self.new_page(context)
                try:
                    await self.ready(page,self.core.ORIGIN+'/remote/')
                    await self.enter_sound(page,part,bank,voice)
                    await page.evaluate('document.fonts.ready')
                    await page.wait_for_timeout(80)
                    await self.snap(page,key,'Fresh stopped Draft, built-in source bank, unfrozen clock, full viewport',errors,full_page=True)
                    state=self.data['states'][key]
                    state.update({'bank':bank,'voice':voice})
                    self.save()
                finally:
                    await page.close()
        finally:
            await context.close()

    async def enter_sound(self,page,part,bank,voice):
        await page.locator('[data-view="sound"]').click()
        await page.locator(f'[data-engine="{part}"]').click()
        if voice>=0:await page.locator('#sound-bank').select_option(bank)
        await expect(page.locator('main')).to_have_attribute('data-layout-view','sound')

    async def behavior(self,browser,width,height,origin):
        context=await browser.new_context(viewport={'width':width,'height':height},has_touch=width<900,
            reduced_motion='reduce',accept_downloads=True)
        try:
            page,errors=await self.new_page(context)
            async def fresh():
                await self.ready(page,origin+'/remote/')
                await expect(page.locator('#undo')).to_be_disabled()
            async def glyph(locator):
                g=locator.locator('[data-glyph-fn]')
                await expect(g.locator('canvas')).to_be_visible()
                state=await g.evaluate("""e=>({role:e.dataset.glyphFn,pots:e.dataset.glyphSoundPots??null,
                    normalized:e.dataset.glyphValue,canvas:e.querySelector('canvas').toDataURL()})""")
                assert len(state['canvas'])>100,state
                state['canvasSHA256']=hashlib.sha256(state.pop('canvas').encode()).hexdigest()
                state['readout']=await locator.locator('output').inner_text()
                return state
            field=page.locator('#parameter-value')
            readout=page.locator('#parameter-readout')
            def unit(address):
                return page.locator(f'#other-view button[data-param="{address}"]')
            async def read(control):
                await control.press('Enter')
                return int(await field.input_value()),await readout.inner_text()
            async def set_value(control,value):
                await read(control)
                await field.fill(str(value))
                await field.press('Tab')
                await expect(field).to_have_value(str(value))
            async def save_draft():
                return json.loads(await self.native.draft_bytes(page))
            async def unchanged_after_undo(control,initial,value):
                await page.locator('#undo').click()
                assert await glyph(control)==initial and (await read(control))[0]==value

            banks={}
            for part,bank,voice in SOUND[:4]:
                await fresh()
                await self.enter_sound(page,part,bank,voice)
                control=lambda p:unit(source_id(bank,voice,p))
                if bank=='CHICAGO':
                    dependencies={2:(32,101,((3,[101]),(4,[101,95]))),
                                  3:(95,7,((4,[32,7]),)),
                                  13:(127,0,((14,[0]),(15,[0]),(16,[0])))}
                    formats={}
                else:
                    dependencies={11:(127,0,((12,[0]),(13,[0,83]))),
                                  12:(83,120,((13,[127,120]),))}
                    formats={3:((0,'-12 st'),(64,'0 st'),(127,'+12 st')),
                             7:((0,'-50.0 %'),(64,'0.0 %'),(127,'+50.0 %')),
                             13:((0,'1/2'),(127,'1/24'))}
                coupled=[]
                for p,(raw,edited,dependent) in dependencies.items():
                    assert (await read(control(p)))[0]==raw,(bank,voice,p)
                    before={target:await glyph(control(target)) for target,_ in dependent}
                    authored=await save_draft()
                    await set_value(control(p),edited)
                    after={target:await glyph(control(target)) for target,_ in dependent}
                    for target,pots in dependent:
                        assert after[target]['role']==f'SOURCE {bank} {target}',after[target]
                        assert after[target]['pots']==':'.join(map(str,pots)),(target,after)
                        assert after[target]['canvasSHA256']!=before[target]['canvasSHA256'],(before,after)
                        assert after[target]['normalized']==before[target]['normalized'] and after[target]['readout']==before[target]['readout'],(before,after)
                    saved=await save_draft()
                    before_map={r['id']:r['value'] for r in authored['parameters']}
                    after_map={r['id']:r['value'] for r in saved['parameters']}
                    assert after_map=={**before_map,source_id(bank,voice,p):edited},(before_map,after_map)
                    await page.locator('#undo').click()
                    assert {target:await glyph(control(target)) for target,_ in dependent}==before
                    assert (await save_draft())['parameters']==authored['parameters']
                    coupled.append({'changed':p,'raw':[raw,edited,raw],'before':before,'after':after})
                readouts={}
                for p,values in formats.items():
                    initial=await glyph(control(p))
                    previous=(await read(control(p)))[0]
                    for raw,text in values:
                        await set_value(control(p),raw)
                        assert (await read(control(p)))==(raw,text),(p,raw,text,await read(control(p)))
                        await expect(control(p).locator('output')).to_have_text(text)
                        await unchanged_after_undo(control(p),initial,previous)
                    readouts[p]=values
                banks[f'{part}-{bank.lower()}']={'coupled':coupled,'formatReadouts':readouts}

            await fresh()
            await self.enter_sound(page,'breaks','BREAK',-1)
            slices={}
            for target in (0,1):
                identity=f'source-sound/BREAK/-1|11:{target}:0:0:-1'
                control=unit(identity)
                initial=await glyph(control)
                assert initial['role']=='BREAK SLICES' and (await read(control))==(1,'8'),initial
                observed={}
                for raw,title in ((0,'4'),(2,'16'),(3,'32')):
                    await set_value(control,raw)
                    edited=await glyph(control)
                    assert edited['readout']==title and edited['canvasSHA256']!=initial['canvasSHA256'],(raw,edited)
                    d=await save_draft()
                    assert next(r['value'] for r in d['parameters'] if r['id']==identity)==raw,d['parameters']
                    if raw==3:
                        saved=json.dumps(d).encode()
                        await page.locator('#draft-file').set_input_files({'name':'break-slices.json','mimeType':'application/json','buffer':saved})
                        await page.locator('#draft-replace').click()
                        await expect(page.locator('#undo')).to_be_disabled()
                        assert await glyph(control)==edited and (await read(control))==(raw,title)
                    else:
                        await unchanged_after_undo(control,initial,1)
                    observed[raw]=edited
                assert len({state['canvasSHA256'] for state in observed.values()}|{initial['canvasSHA256']})==4
                slices[identity]={'default':initial,'edited':observed,'reopenedRaw':3}

            await fresh()
            await page.locator('[data-view="mix"]').click()
            await page.locator('[data-mix-mode="master"]').click()
            more=[]
            for t,p in self.master.MORE:
                control=page.locator(self.master.selector(t,p))
                await control.scroll_into_view_if_needed()
                measured=await control.evaluate(self.master.GEOMETRY)
                self.master.whole(measured['unit'])
                assert all(hit['owned'] for hit in measured['hits']),measured
                for name in ('label','value','glyph'):
                    self.master.whole(measured['parts'][name])
                c=next(row for row in self.master.SOURCE['controls'] if (row['target'],row['parameter'])==(t,p))
                initial=await glyph(control)
                role=f'MASTER MORE CHOICE {c["max"]+1}' if (t,p) in self.master.NAMED_MORE else 'MASTER MORE AMOUNT'
                assert initial['role']==role,initial
                value=0 if c['default'] else c['max']
                for next_value in (value,c['max'] if value==0 else 0):
                    if next_value==c['default']:continue
                    await set_value(control,next_value)
                    edited=await glyph(control)
                    assert edited['readout']==c['displays'][next_value] and edited['canvasSHA256']!=initial['canvasSHA256'],(t,p,edited,initial)
                    assert self.master.raw(await save_draft(),t,p)==next_value
                    await unchanged_after_undo(control,initial,c['default'])
                more.append({'identity':f'{t}:{p}','role':role,'unitBounds':measured['unit']['effective'],
                             'default':initial,'edited':edited,'freshUndo':True})
            assert not errors and await page.evaluate('midiCalls')==0,errors
            self.data['behaviors'][f'{width}x{height}']={'sourceBanks':banks,'breakSlices':slices,'masterMore':more,'midiCalls':0}
            self.save()
            print('PASS changed Sound dependencies/units, BREAK Slices, and twelve Master More rectangles',width,height,flush=True)
        finally:
            await context.close()

    async def run(self):
        if self.phase=='registered':
            self.data['clockInputs']={'epochMs':1794790800000,'randomSeed':42,'locale':'en-US','timezone':'UTC',
                'DPR':1,'motion':'reduce','flags':FLAGS,'freezeJS':hashlib.sha256(self.visual['FREEZE_JS'].encode()).hexdigest(),
                'freezeCSS':hashlib.sha256(self.visual['FREEZE_CSS'].encode()).hexdigest()}
        self.save()
        with self.server(self.site) as origin:
            async with async_playwright() as pw:
                for width,height in SIZES:
                    key=f'{width}x{height}'
                    if self.phase=='behavior' and key in self.data['behaviors']:continue
                    browser=await pw.chromium.launch(chromium_sandbox=True,args=FLAGS if self.phase=='registered' else [])
                    try:
                        self.data['chromium']=browser.version
                        if self.phase=='registered':
                            await self.registered(browser,width,height,origin)
                        elif self.phase=='sound':
                            await self.sound(browser,width,height)
                        else:
                            await self.behavior(browser,width,height,origin)
                    except Exception as error:
                        self.data['errors'].append({'size':key,'type':type(error).__name__,'error':str(error)})
                        self.save()
                        traceback.print_exc()
                    finally:
                        await browser.close()
        self.assert_source()
        assert not self.data['errors'],self.data['errors']
        if self.phase=='behavior':
            assert len(self.data['behaviors'])==4
        else:
            assert len(self.data['states'])=={'registered':32,'sound':20}[self.phase]
        self.data['result']='PASS'
        self.save()


if __name__=='__main__':
    cli=argparse.ArgumentParser(description=__doc__)
    for name in ('checkout','site','output'):cli.add_argument(name,type=lambda value:Path(value).resolve())
    for name in ('commit','tree'):cli.add_argument('--'+name,required=True)
    cli.add_argument('--phase',choices=('registered','sound','behavior'),required=True)
    cli.add_argument('--resume',action='store_true')
    asyncio.run(Runner(cli.parse_args()).run())
