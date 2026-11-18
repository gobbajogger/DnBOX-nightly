"""Real local Song selection/edit/move/remove/history/import; no native playback."""
import asyncio,importlib.util,json,subprocess,tempfile
from pathlib import Path
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('funky',Path(__file__).with_name('funkybeats-browser.py'));core=importlib.util.module_from_spec(spec);spec.loader.exec_module(core)
ROWS=[{'patterns':[0,1,2,3,4],'repeats':2},{'patterns':[5,6,7,8,9],'repeats':3},{'patterns':[10,11,12,13,14],'repeats':4}]
async def cases(evidence=None):
 proof=[]
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(chromium_sandbox=True)
  try:
   for w,h in [(1440,900),(390,844),(844,390)]:
    c=await browser.new_context(viewport={'width':w,'height':h},has_touch=True);await c.route('**/*',core.serve);p=await c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
    await p.add_init_script('window.midiCalls=0;navigator.requestMIDIAccess=()=>{midiCalls++;throw Error("No device access")}')
    try:
     await p.goto(core.ORIGIN+'/remote/');await expect(p.locator('main')).to_have_attribute('aria-busy','false');seed=await core.draft_state(p);seed['song']=json.loads(json.dumps(ROWS));seed['launch']=[15,16,17,18,19];seed['context']['view']='song';await core.load_draft(p,seed)
     fields=p.locator('[data-song-pattern]');await expect(fields).to_have_count(15)
     async def screenshot(name):
      if evidence:
       folder=Path(evidence).parent/'screenshots';folder.mkdir(exist_ok=True);await p.screenshot(path=str(folder/f'{w}x{h}-{name}.png'))
     await screenshot('populated')
     async def song():return (await core.draft_state(p))['song']
     def radio(i):return p.locator(f'[data-song-select="{i}"]')
     def pattern(i,part):return p.locator(f'[data-song-pattern="{i}"][data-song-part="{part}"]')
     await radio(0).focus();await p.keyboard.press('Tab')
     for row in range(3):
      for part in range(5):
       field=pattern(row,part);await expect(field).to_be_focused();assert await field.locator('option').count()==32
       box=await field.bounding_box();assert box and box['height']>=40 and box['x']>=0 and box['x']+box['width']<=w+1, {'size':[w,h],'row':row,'part':part,'box':box,'scroll':await p.locator('.song-scroll').evaluate('e=>({width:e.clientWidth,left:e.scrollLeft,scrollWidth:e.scrollWidth,box:e.getBoundingClientRect().toJSON()})')}
       await p.keyboard.press('Tab')
      await expect(p.locator(f'[data-song-row="{row}"]')).to_be_focused();await p.keyboard.press('Tab')
     await pattern(1,2).focus();await pattern(1,2).press('End');await pattern(1,2).press('Tab');await expect(pattern(1,2)).to_have_value('31')
     changed=json.loads(json.dumps(ROWS));changed[1]['patterns'][2]=31;assert await song()==changed
     await p.locator('#song-undo').click();await expect(radio(0)).to_be_checked();await expect(radio(0)).to_be_focused();assert await song()==ROWS
     await p.locator('#song-redo').click();await expect(radio(1)).to_be_checked();assert await song()==changed
     # Inject an out-of-domain option through the real change path: no partial data/history mutation.
     await pattern(1,2).evaluate("e=>{e.add(new Option('invalid','32'));e.value='32';e.dispatchEvent(new Event('change',{bubbles:true}))}")
     await expect(pattern(1,2)).to_have_value('31');await expect(pattern(1,2)).to_be_focused();await expect(p.locator('#status')).to_have_text('Pattern must be P01–P32.');assert await song()==changed
     await p.locator('[data-song-row="1"]').fill('9');await p.locator('[data-song-row="1"]').press('Tab');await expect(p.locator('[data-song-row="1"]')).to_have_value('3');await expect(p.locator('#status')).to_have_text('Repeats must be 1–8.');assert await song()==changed
     await p.locator('#song-undo').click();assert await song()==ROWS # invalid actions added no history
     await p.locator('#song-redo').click()
     await radio(1).check();await p.locator('#song-up').click();await expect(radio(0)).to_be_checked();await expect(radio(0)).to_be_focused();await expect(p.locator('#song-up')).to_be_disabled()
     moved=[changed[1],changed[0],changed[2]];assert await song()==moved
     await p.locator('#song-undo').click();await expect(radio(1)).to_be_checked();assert await song()==changed
     await p.locator('#song-redo').click();assert await song()==moved
     await p.locator('#song-down').click();await expect(radio(1)).to_be_focused();assert await song()==changed
     await radio(2).check();await expect(p.locator('#song-down')).to_be_disabled()
     await radio(1).check();await p.locator('#song-remove').click();await expect(radio(1)).to_be_checked();await expect(radio(1)).to_be_focused();assert await song()==[changed[0],changed[2]]
     await p.locator('#song-undo').click();assert await song()==changed
     await p.locator('#song-add').click();await expect(radio(3)).to_be_focused();added=changed+[{'patterns':seed['launch'],'repeats':1}];assert await song()==added
     await screenshot('added-selected')
     saved=await core.draft_state(p);await core.load_draft(p,saved);assert await song()==added
     await p.locator('#song-review').click();await expect(p.locator('#review-dialog')).to_be_visible();await expect(p.locator('#changes')).to_contain_text('Song row 4');await p.locator('#review-dialog').get_by_role('button',name='Return').click();await expect(p.locator('#song-review')).to_be_focused()
     for index in [3,2,1,0]:
      await radio(index).check();await p.locator('#song-remove').click()
     await expect(p.locator('#song-add')).to_be_focused();await expect(p.locator('#song-remove')).to_be_disabled();await screenshot('empty');assert await song()==[]
     await p.locator('#song-undo').click();await expect(radio(0)).to_be_focused();assert await song()==[changed[0]]
     assert await p.evaluate('document.documentElement.scrollWidth<=innerWidth');assert await p.evaluate('midiCalls')==0;assert not errors,errors
     proof.append({'size':[w,h],'rowsRoundTripped':4,'fivePartChoices':15,'patternBounds':[0,31],'invalidAtomic':True,'focusAndBoundaries':True,'midiCalls':0})
     print('SONG_BROWSER PASS',w,h,'choose/move/remove/history/atomic-invalid/roundtrip/focus',flush=True)
    finally:await c.close()
  finally:await browser.close()
 if evidence:Path(evidence).write_text(json.dumps(proof,indent=2)+'\n')
 print('SONG_BROWSER PASS all3sizes; Draft only',flush=True)
def main():
 (ROOT/'.output').mkdir(exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='song-',dir=ROOT/'.output') as output:
  core.SOURCE=Path(output);subprocess.run(['node','scripts/build-product-site.mjs','--output',output],cwd=ROOT,check=True);asyncio.run(cases())
if __name__=='__main__':main()
