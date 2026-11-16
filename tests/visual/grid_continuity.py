# SPDX-License-Identifier: GPL-3.0-only
"""Actual pixel assertion: every pitch row has the same continuous time lines.

All128rows, includingblackkeys, areinspected throughthescrollingrenderedviewport.
Hidingnotesonly removesintentionalnoteocclusion; rowshadingandproductiongridstay.
"""
import io
from PIL import Image

def assert_grid_continuity(pg):
    before=pg.evaluate("({top:document.querySelector('#roll-scroll').scrollTop,left:document.querySelector('#roll-scroll').scrollLeft})")
    style=pg.add_style_tag(content='.note{visibility:hidden!important}')
    seen={}
    try:
        pg.evaluate("document.querySelector('#roll-scroll').scrollLeft=0")
        for start in range(0,128,4):
            d=pg.evaluate("""n=>{const v=document.querySelector('#roll-scroll'),g=document.querySelector('#roll-grid'),row=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--row'));v.scrollTop=n*row;const r=g.getBoundingClientRect(),box=v.getBoundingClientRect();return{top:r.top,left:r.left,row,step:g.offsetWidth/16,box:{x:box.x,y:box.y,w:box.width,h:box.height}}}""",start)
            shot=Image.open(io.BytesIO(pg.screenshot())).convert('RGB')
            for row in range(128):
                y=round(d['top']+(row+.5)*d['row'])
                if not d['box']['y']+2<=y<d['box']['y']+d['box']['h']-3:continue
                for col in (0,2,4,8):
                    x=round(d['left']+col*d['step'])
                    if not d['box']['x']+(0 if col==0 else 2)<=x<d['box']['x']+d['box']['w']-3:continue
                    expected=(65,80,82)if col==0 else(25,38,43)if col==2 else(41,61,67)
                    samples=[shot.getpixel((xx,y))for xx in range(max(0,x-1),min(shot.width,x+2))]
                    seen[row,col]=min(samples,key=lambda rgb:sum(abs(a-b)for a,b in zip(rgb,expected)))
        errors=[]
        for(row,col),rgb in seen.items():
            expected=(65,80,82)if col==0 else(25,38,43)if col==2 else(41,61,67)
            if max(abs(a-b)for a,b in zip(rgb,expected))>2:errors.append(f'pitch-row{row}, subdivision{col}: {rgb} != {expected}')
        if len(seen)!=512:errors.append(f'Incomplete row coverage: {len(seen)}/512 samples')
        if errors:raise AssertionError('; '.join(errors[:12]))
        return{'rows':128,'samples':len(seen),'failures':0}
    finally:
        style.evaluate('(el)=>el.remove()')
        pg.evaluate("p=>{const v=document.querySelector('#roll-scroll');v.scrollTop=p.top;v.scrollLeft=p.left}",before)
