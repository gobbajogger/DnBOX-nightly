# SPDX-License-Identifier: GPL-3.0-only
"""Owner page 15: complete 6x16 landscape drum bank, real taps and Undo."""
import argparse, asyncio, hashlib, importlib.util, json, subprocess
from pathlib import Path
from playwright.async_api import async_playwright, expect
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('funky',Path(__file__).with_name('funkybeats-browser.py'))
core=importlib.util.module_from_spec(spec);spec.loader.exec_module(core)
MEASURE='''() => {
 const cells=[...document.querySelectorAll('.sequencer-grid [data-drum-note]')];
 function whole(e){const r=e.getBoundingClientRect();let l=0,t=0,b=innerHeight,z=innerWidth;
  for(let p=e.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),q=p.getBoundingClientRect();
   if(/auto|scroll|clip|hidden/.test(s.overflowX)){l=Math.max(l,q.left);z=Math.min(z,q.right)}
   if(/auto|scroll|clip|hidden/.test(s.overflowY)){t=Math.max(t,q.top);b=Math.min(b,q.bottom)}}
  return r.width>0&&r.height>0&&r.left>=l-.1&&r.right<=z+.1&&r.top>=t-.1&&r.bottom<=b+.1&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}
 const visible=cells.map((e,i)=>whole(e)?[Math.floor(i/16),i%16]:null).filter(Boolean);
 return {viewport:[innerWidth,innerHeight],body:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],bodyWidth:[document.body.scrollWidth,document.body.clientWidth],hiddenScroll:[document.body.scrollLeft,document.body.scrollTop,scrollX,scrollY],
  mounted:cells.length,visible,first:cells[0].getBoundingClientRect().toJSON(),
  sound:document.querySelector('.drum-sound-panel').getBoundingClientRect().toJSON(),
  navigation:[...document.querySelectorAll('.drum-grid-navigation button')].map(e=>({name:e.textContent,whole:whole(e)}))};
}'''
async def run(out,observe,viewport=None):
 async with async_playwright() as p:
  browser=await p.chromium.launch(chromium_sandbox=True)
  result={'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'browser':browser.version,'sourceSha256':{name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in ['web/product-site/remote/style.css','web/product-site/remote/funkybeats-view.mjs','web/product-site/remote/glyph-registry.mjs','tests/product-remote/page15-density-browser.py']},'states':[],'errors':[]}
  try:
   context=await browser.new_context(has_touch=True)
   await context.route('**/*',core.serve)
   page=await context.new_page();page.on('pageerror',lambda e:result['errors'].append(str(e)))
   for width,height in ([tuple(viewport)] if viewport else [(844,390),(740,390),(736,414),(640,360),(900,390),(1080,390),(390,844),(1440,900)]):
    await page.set_viewport_size({'width':width,'height':height})
    await page.goto(core.ORIGIN+'/remote/');await expect(page.locator('main')).to_have_attribute('aria-busy','false')
    for kit in ['909','808']:
     await page.locator('[data-engine="drum'+kit+'"]').click()
     await page.locator('.overflow summary').click();await page.locator('[data-view="drums"]').click();await page.locator('.overflow summary').click()
     await page.evaluate('document.fonts.ready')
     state=await page.evaluate(MEASURE);state['kit']=kit;result['states'].append(state)
     await page.screenshot(path=out/f'{kit}-{width}x{height}.png')
     (out/'measurements.json').write_text(json.dumps(result,indent=2))
     assert state['mounted']==176 and state['body'][0]<=width and state['body'][1]<=height,state
     assert state['hiddenScroll']==[0,0,0,0] and state['bodyWidth'][0]<=state['bodyWidth'][1],state
     if width==844:
      print('PAGE15',kit,'visible',len(state['visible']),'first',state['first'],flush=True)
      if not observe:
       assert all([r,s] in state['visible'] for r in range(6) for s in range(16)),state
       assert all(n['whole'] for n in state['navigation']),state
       assert await page.locator('.sequencer-grid .drum-voice-glyph').count()==11
       ink=await page.locator('#drum-lane output').evaluate_all("""els=>els.map(e=>{
        const q=e.getBoundingClientRect(), p=e.closest('#drum-lane').getBoundingClientRect();
        return {value:e.textContent,top:q.top,bottom:q.bottom,clip:[p.top,p.bottom]};
       })""")
       assert all(v['top']>=v['clip'][0] and v['bottom']<=v['clip'][1] for v in ink),ink
       state['laneReadouts']=ink
       for row in [0,5]:
        cell=page.locator('.sequencer-grid [data-drum-note]').nth(row*16+15)
        before=await cell.get_attribute('aria-pressed');await cell.tap()
        await expect(cell).not_to_have_attribute('aria-pressed',before)
        await page.locator('#undo').click();await expect(cell).to_have_attribute('aria-pressed',before)
       nav=page.get_by_role('navigation',name=kit+' step navigation')
       await nav.get_by_role('button',name='Voices 7–11',exact=True).press('Enter')
       await expect(page.locator('.sequencer-grid [data-drum-note]').nth(96)).to_be_focused()
       await nav.get_by_role('button',name='Accent lane',exact=True).tap()
       await expect(page.locator('[data-drum-accent-step]').first).to_be_focused()
       await nav.get_by_role('button',name='Voices 1–6',exact=True).tap()
       restored=await page.evaluate(MEASURE)
       assert all([r,s] in restored['visible'] for r in range(6) for s in range(16)),restored
   assert not result['errors'],result['errors']
   result['status']='OBSERVED' if observe else 'PASS';(out/'measurements.json').write_text(json.dumps(result,indent=2))
   print(result['status'],len(result['states']),'complete product drum states',flush=True)
  finally:await browser.close()
if __name__=='__main__':
 cli=argparse.ArgumentParser();cli.add_argument('--output',type=Path,default=ROOT/'.output/page15-density-proof');cli.add_argument('--observe',action='store_true');cli.add_argument('--viewport',type=int,nargs=2);args=cli.parse_args()
 out=args.output.resolve();out.mkdir(parents=True,exist_ok=True);core.SOURCE=ROOT/'.output/page15-density'
 subprocess.run(['node','scripts/build-product-site.mjs','--output',str(core.SOURCE)],cwd=ROOT,check=True)
 asyncio.run(run(out,args.observe,args.viewport))
