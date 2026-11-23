# SPDX-License-Identifier: GPL-3.0-only
import asyncio,mimetypes,subprocess,tempfile,json,re,html
from pathlib import Path
from urllib.parse import urlparse,unquote
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
async def main(site):
 normalize=lambda s:re.sub(r'\s+','',s).replace('\u00ad','')
 preserved=json.loads((ROOT/'tests/manual-content-preserved.json').read_text())
 phrases=[html.unescape(re.sub('<[^>]+>','',original)) for original in preserved['paragraphs']+preserved['items']]
 expected=[(phrase,normalize(phrase)) for phrase in phrases]
 print_failures=[]
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(chromium_sandbox=True)
  try:
   for width,height in [(1440,900),(390,844),(844,390)]:
    c=await browser.new_context(viewport={'width':width,'height':height});p=await c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
    async def route(r):
     u=urlparse(r.request.url);path=(site/unquote(u.path).lstrip('/')).resolve()
     if path.is_dir():path=path/'index.html'
     if u.hostname!='dnbox.test' or not path.is_relative_to(site.resolve()) or not path.is_file():await r.abort();return
     await r.fulfill(body=path.read_bytes(),content_type=mimetypes.guess_type(str(path))[0] or 'application/octet-stream')
    await c.route('**/*',route)
    try:
     await p.goto('https://dnbox.test/manual/',wait_until='networkidle')
     assert await p.locator('.manual-chapter').count()==8
     assert await p.locator('.beat-steps li.hit').all_text_contents()==['1','5','9','13']
     assert await p.locator('.manual-chapter').first.evaluate('(e)=>getComputedStyle(e).borderRadius')=='0px'
     summaries=p.locator('.manual-chapter summary')
     for i in range(8):
      node=summaries.nth(i);await node.focus();old=await node.evaluate('(e)=>e.parentElement.open');await node.press('Enter');assert await node.evaluate('(e)=>e.parentElement.open')!=old
     projects_topic=p.locator('.manual-topics a[href="#projects"]')
     projects_chapter=p.locator('.manual-chapter').filter(has=p.locator('#projects'))
     projects_body=projects_chapter.locator('.chapter-body')
     # hashchange is queued after the URL updates; wait for the page to handle it before closing the chapter.
     await p.evaluate("window.__projectsHash=new Promise(r=>addEventListener('hashchange',()=>r(location.hash),{once:true}));0")
     await projects_topic.click()
     await p.wait_for_url('**/manual/#projects')
     assert await p.evaluate('window.__projectsHash')=='#projects'
     await projects_body.wait_for(state='visible')
     await projects_chapter.locator('summary').press('Enter')
     assert not await projects_chapter.evaluate('(e)=>e.open')
     assert not await projects_body.is_visible()
     assert urlparse(p.url).fragment=='projects'
     await projects_topic.press('Enter')
     assert urlparse(p.url).fragment=='projects'
     assert await projects_chapter.evaluate('(e)=>e.open')
     assert await projects_body.is_visible()
     await p.locator('.manual-topics a[href="#recovery-and-older-firmware"]').click()
     assert await p.locator('#recovery-and-older-firmware').evaluate('(e)=>e.closest("details").open')
     await p.goto('https://dnbox.test/manual/#projects',wait_until='networkidle');assert await p.locator('#projects').evaluate('(e)=>e.closest("details").open')
     prior=await p.locator('.manual-chapter').evaluate_all('(es)=>es.map(e=>e.open)')
     await p.evaluate('dispatchEvent(new Event("beforeprint"))');assert await p.locator('.manual-chapter[open]').count()==8
     await p.evaluate('dispatchEvent(new Event("beforeprint"))');await p.evaluate('dispatchEvent(new Event("afterprint"))');assert await p.locator('.manual-chapter').evaluate_all('(es)=>es.map(e=>e.open)')==prior
     assert await p.evaluate('document.documentElement.scrollWidth===innerWidth');assert not errors,errors
     await p.goto('https://dnbox.test/manual/#s3',wait_until='networkidle');await p.wait_for_url('**/manual/original/#s3')
     await p.goto('https://dnbox.test/manual/',wait_until='networkidle')
     out=ROOT/'test-results/manual-reading';out.mkdir(parents=True,exist_ok=True);await p.screenshot(path=str(out/f'manual-{width}x{height}.png'),full_page=True)
     if width==1440:
      for javascript in (True,False):
       pc=await browser.new_context(java_script_enabled=javascript);await pc.route('**/*',route)
       try:
        pp=await pc.new_page();await pp.goto('https://dnbox.test/manual/',wait_until='networkidle')
        pdf=out/f'manual-print-js-{javascript}.pdf';await pp.pdf(path=str(pdf))
        await pp.emulate_media(media='print')
        paper=await pp.evaluate('''() => {
         const style=e=>getComputedStyle(e);
         const luminance=color=>{
          const channels=color.match(/[\\d.]+/g).slice(0,3).map(v=>{
           v=Number(v)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
          });
          return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
         };
         const body=style(document.body);
         const text=[document.body,...document.querySelectorAll('.chapter-body p,.chapter-body li,.chapter-lead,.reference-version,h1,h2,h3,header a,header small,footer a')];
         return {
          background:body.backgroundColor,
          minimumTextContrast:Math.min(...text.map(e=>1.05/(luminance(style(e).color)+.05))),
          steps:[...document.querySelectorAll('.beat-steps li')].map(e=>({
           step:e.textContent,hit:e.classList.contains('hit'),
           width:parseFloat(style(e).borderTopWidth),style:style(e).borderTopStyle,
           color:style(e).borderTopColor
          }))
         };
        }''')
        problems=[]
        if paper['background']!='rgb(255, 255, 255)':problems.append('paper background is not white')
        if paper['minimumTextContrast']<4.5:problems.append('paper text contrast below 4.5:1')
        hits=[s for s in paper['steps'] if s['hit']];rests=[s for s in paper['steps'] if not s['hit']]
        if not all(s['width']>=max(r['width'] for r in rests)+1 and s['style']=='solid' and s['color']!='rgba(0, 0, 0, 0)' for s in hits):problems.append('printed hits lack a heavier monochrome border')
        print('manual print appearance',javascript,json.dumps(paper),flush=True)
        print_failures.extend((javascript,problem) for problem in problems)
        text=subprocess.check_output(['pdftotext','-layout',str(pdf),'-'],text=True)
        normalized=normalize(text)
        for phrase,wanted in expected:
         assert wanted in normalized,('print lost text',javascript,phrase[:100])
       finally:await pc.close()
     print('PASS manual keyboard/hash/print/legacy/fit' ,width,height,flush=True)
    finally:await c.close()
  finally:await browser.close()
 assert not print_failures,('manual print appearance',print_failures)
(ROOT/'.output').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='manual-journey-',dir=ROOT/'.output') as tmp:
 site=Path(tmp)/'site';subprocess.run(['node','scripts/build-product-site.mjs','--output',str(site)],cwd=ROOT,check=True);asyncio.run(main(site))
