#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Fail-closed structural checks1–4 against a real Playwright Page.

collect_structural(page) returns JSON-serializable evidence. It never navigates,
changes UI state, writes files, approves a render, or launches a browser.
Pure analyze_snapshot tests prove detector logic, not browser execution.
"""
from collections import defaultdict
import re

MIN_CONTENT_COVERAGE = .70
MAX_EMPTY_SCREEN_FRACTION = .12
# An explicit, deliberately narrow reviewed vocabulary. Unknown captions fail.
# These abbreviations are approved ONLY for this test's syntax policy, not an
# owner approval of the UI. Expand through reviewed test changes, never guessing.
CAPTION_WORDS = frozenset('STEREO LOW CUT EDIT RETURN SLICES TYPE KIT SOUND CHICAGO MIAMI BREAK BASS A B 909 808 1 2 TUNE ATTACK DECAY TONE PITCH DEPTH LEVEL ACCENT PAN CUTOFF PEAK SUSTAIN RELEASE WAVE GLIDE RANGE MODE RATE SHAPE WIDTH DRIVE FOLD CRUSH FEEDBACK DELAY REVERB FILTER RESONANCE AMOUNT VELOCITY CHANCE OCTAVE OCTAVES DIRECTION SWITCH GATE ENVELOPE NOISE PULSE OFFSET DETUNE BALANCE SEND VOLUME MIX TIME MASTER ON OFF LENGTH HOLD GAIN VOICE SOURCE DESTINATION KEY TRACKING SYNC SPREAD COLOR COLOUR SPEED'.split())
CAPTION_ABBREVIATIONS = frozenset('SUB ENV/GATE CHO HPF LPF BPF ENV LFO OSC FM AM PM PWM FX REV DLY RES DIST XMOD BD SD LT MT HT RS CP CB CY OH CH CR RD'.split())


def typed_ref(param):
    """Canonical engine identity, not a presentation path or occurrence counter.

    Mirrors display.mjs's kind,a,b,c,bank tuple and source-sound slot-derived
    part. The display path cannot hide two bindings to the same engine field.
    """
    if not isinstance(param, str) or param.count('|') != 1:
        return None
    context, key = param.split('|')
    if not re.fullmatch(r'\d+:\d+:\d+:\d+(?::-?\d+)?', key):
        return None
    nums = [int(n) for n in key.split(':')]
    kind, a, b, c = nums[:4]
    bank = nums[4] if len(nums) == 5 else -1
    part = a if a in (0, 1) else -1
    if context.startswith('source-sound/'):
        components = context.split('/')
        if len(components) != 3:
            return None
        bank_name=components[1].upper()
        if bank_name=='BREAK' and components[2]=='-1':
            part=4
        elif bank_name in ('CHICAGO','MIAMI','JUNO') and components[2] in ('0','1'):
            part=int(components[2])+2
        else:
            return None
    return (kind, a, b, c, bank, part)


def _clip(a, b):
    x, y = max(a['x'], b['x']), max(a['y'], b['y'])
    r, bottom = min(a['x'] + a['w'], b['x'] + b['w']), min(a['y'] + a['h'], b['y'] + b['h'])
    return {'x': x, 'y': y, 'w': max(0, r - x), 'h': max(0, bottom - y)}


def _area(r):
    return max(0, r['w']) * max(0, r['h'])


def largest_empty_rect(panel, content):
    """Exact axis-aligned maximum empty rectangle, touching paint is allowed.

    Coordinate-compressed sweep and weighted histogram: O(n²) time/O(n) extra
    storage, no raster grid, rounded coordinates, tolerance, or padding waiver.
    """
    rs = [r for c in content if _area(r := _clip(c, panel)) > 0]
    xs = sorted({panel['x'], panel['x'] + panel['w'], *(x for r in rs for x in (r['x'], r['x'] + r['w']))})
    ys = sorted({panel['y'], panel['y'] + panel['h'], *(y for r in rs for y in (r['y'], r['y'] + r['h']))})
    yi = {v: i for i, v in enumerate(ys)}
    events = defaultdict(list)
    for r in rs:
        for x, sign in ((r['x'], 1), (r['x'] + r['w'], -1)):
            events[x].append((yi[r['y']], yi[r['y'] + r['h']], sign))
    counts, widths = [0] * (len(ys) - 1), [0] * (len(ys) - 1)
    best = {'x': panel['x'], 'y': panel['y'], 'w': 0, 'h': 0}
    for left, right in zip(xs, xs[1:]):
        for first, last, sign in events[left]:
            for i in range(first, last):
                counts[i] += sign
        for i in range(len(widths)):
            widths[i] = 0 if counts[i] else widths[i] + right - left
        stack = []
        for i in range(len(widths) + 1):
            width = widths[i] if i < len(widths) else 0
            start = i
            while stack and stack[-1][1] > width:
                first, old_width = stack.pop()
                candidate = {'x': right - old_width, 'y': ys[first], 'w': old_width, 'h': ys[i] - ys[first]}
                if _area(candidate) > _area(best):
                    best = candidate
                start = first
            if width and (not stack or stack[-1][1] < width):
                stack.append((start, width))
    return best


def _caption_status(caption):
    text=' '.join(str(caption or '').split()).upper()
    if len(text)<2 or text in ('P.DPTH','P.DEPTH'):
        return 'FAIL'
    if all(w in CAPTION_WORDS or w in CAPTION_ABBREVIATIONS for w in text.split()):
        return 'PASS'
    return 'REVIEW_REQUIRED'  # Unknown copy is not proof that painted text is absent.


def _caption_valid(caption):
    return _caption_status(caption)=='PASS'


def analyze_snapshot(snapshot):
    """Same detectors for live DOM, minimized defects, and pure geometry tests."""
    checks = [{'id': i, 'status': 'NOT_RUN', 'failures': [], 'measurements': []} for i in range(1, 5)]
    controls, glyphs, panels = (snapshot.get(k, []) for k in ('controls', 'glyphs', 'panels'))
    by_ref = defaultdict(list)
    for c in controls:
        ref = typed_ref(c.get('param'))
        if ref is None:
            checks[0]['failures'].append({'reason': 'missing-or-invalid-typed-ref', 'control': c})
        else:
            by_ref[ref].append(c)
    for ref, rows in by_ref.items():
        if len(rows) > 1:
            checks[0]['failures'].append({'reason': 'duplicate-engine-param', 'typedRef': list(ref), 'controls': rows})
    checks[0]['measurements'] = [{'typedRef': list(ref), 'count': len(rows)} for ref, rows in by_ref.items()]
    by_glyph = defaultdict(list)
    for g in glyphs:
        ref = typed_ref(g.get('param'))
        if ref is None or not g.get('type'):
            checks[1]['failures'].append({'reason': 'missing-glyph-type-or-typed-ref', 'glyph': g})
        else:
            by_glyph[(str(g['type']).upper(), ref)].append(g)
        if not g.get('captionPainted') or _caption_status(g.get('caption'))=='FAIL':
            checks[3]['failures'].append({'reason':'missing-unpainted-or-cryptic-caption','glyph':g})
        elif _caption_status(g.get('caption'))=='REVIEW_REQUIRED':
            checks[3].setdefault('unreviewed',[]).append(g)
    for (family, ref), rows in by_glyph.items():
        if len(rows) > 1:
            checks[1]['failures'].append({'reason': 'duplicate-glyph-binding', 'type': family, 'typedRef': list(ref), 'glyphs': rows})
    checks[1]['measurements'] = [{'type': family, 'typedRef': list(ref), 'count': len(rows)} for (family, ref), rows in by_glyph.items()]
    checks[3]['measurements'] = [{'id': g.get('id'), 'caption': g.get('caption'), 'captionPainted': g.get('captionPainted', False)} for g in glyphs]
    screen_area = _area(snapshot['screen']['rect'])
    for panel in panels:
        bounds = panel['rect']
        rs = [r for c in panel.get('contentRects', []) if _area(r := _clip(c, bounds)) > 0]
        if rs:
            x, y = min(r['x'] for r in rs), min(r['y'] for r in rs)
            bbox = {'x': x, 'y': y, 'w': max(r['x'] + r['w'] for r in rs) - x, 'h': max(r['y'] + r['h'] for r in rs) - y}
        else:
            bbox = {'x': bounds['x'], 'y': bounds['y'], 'w': 0, 'h': 0}
        coverage = _area(bbox) / _area(bounds) if _area(bounds) else 0
        empty = largest_empty_rect(bounds, rs)
        empty_fraction = _area(empty) / screen_area if screen_area else 1
        visible=panel.get('visibleRect',bounds)
        partial=_area(visible)<_area(bounds)-1e-9
        measure = {'partialView':partial,'visibleRect':visible,'panelId': panel['id'], 'panelRect': bounds, 'contentBBox': bbox, 'contentCoverage': coverage,
                   'largestEmptyRect': empty, 'largestEmptyScreenFraction': empty_fraction,
                   'minimumCoverage': MIN_CONTENT_COVERAGE, 'maximumEmptyScreenFraction': MAX_EMPTY_SCREEN_FRACTION,
                   'paintRectCount': len(rs)}
        checks[2]['measurements'].append(measure)
        if partial:
            checks[2].setdefault('incompletePanels',[]).append(panel['id'])
        elif coverage < MIN_CONTENT_COVERAGE or empty_fraction > MAX_EMPTY_SCREEN_FRACTION:
            checks[2]['failures'].append(measure)
    for row, observed in zip(checks, (controls, glyphs, panels, glyphs)):
        if observed:
            row['status'] = 'FAIL' if row['failures'] else 'NOT_RUN' if row.get('incompletePanels') else 'REVIEW_REQUIRED' if row.get('unreviewed') else 'PASS'
    errors = snapshot.get('collectionErrors', [])
    return {'schema': 'dnbox-web-structural/1', 'screen': snapshot['screen'], 'checks': checks,
            'controls': controls, 'glyphs': glyphs, 'panels': panels, 'collectionErrors': errors,
            'thresholds': {'minimumPanelContentBBoxCoverage': MIN_CONTENT_COVERAGE, 'maximumEmptyRectangleScreenFraction': MAX_EMPTY_SCREEN_FRACTION},
            'captionPolicy': {'words': sorted(CAPTION_WORDS), 'abbreviations': sorted(CAPTION_ABBREVIATIONS)},
            'accepted': not errors and all(c['status'] == 'PASS' for c in checks)}


# Collection reads actual computed style, viewport/overflow clipping, text Range
# boxes, SVG graphics and foreground canvas pixels. It never uses aria-label,
# data-param, or a parameter name as a substitute for a painted caption.
DOM_SNAPSHOT = r'''() => {
 const errors=[];
 const box=r=>({x:r.x,y:r.y,w:r.width??r.w,h:r.height??r.h});
 const area=r=>Math.max(0,r.w)*Math.max(0,r.h);
 const intersect=(a,b)=>{let x=Math.max(a.x,b.x),y=Math.max(a.y,b.y);return{x,y,w:Math.max(0,Math.min(a.x+a.w,b.x+b.w)-x),h:Math.max(0,Math.min(a.y+a.h,b.y+b.h)-y)}};
 const viewport={x:0,y:0,w:innerWidth,h:innerHeight};
 const paintStyle=e=>{for(let n=e;n instanceof Element;n=n.parentElement){let s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||s.visibility==='collapse'||Number(s.opacity)===0||s.contentVisibility==='hidden')return false;}return true};
 const clipped=(e,r=box(e.getBoundingClientRect()))=>{if(!paintStyle(e))return {...r,w:0,h:0};r=intersect(r,viewport);for(let n=e.parentElement;n;n=n.parentElement){let s=getComputedStyle(n),b=box(n.getBoundingClientRect());if(['hidden','clip','scroll','auto'].includes(s.overflowX))r=intersect(r,{x:b.x,y:r.y,w:b.w,h:r.h});if(['hidden','clip','scroll','auto'].includes(s.overflowY))r=intersect(r,{x:r.x,y:b.y,w:r.w,h:b.h});}return r};
 const visible=e=>area(clipped(e))>0;
 const id=e=>e.id||e.getAttribute('data-structural-panel')||e.getAttribute('data-source-frame')||e.tagName.toLowerCase()+'.'+[...e.classList].join('.');
 const transparent=c=>c==='transparent'||/rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(c);
 const texts=root=>{const out=[],walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){if(!node.textContent.trim())continue;const e=node.parentElement;if(!e||e.closest('script,style,template')||!paintStyle(e))continue;const s=getComputedStyle(e);if(transparent(s.color)||s.webkitTextFillColor&&transparent(s.webkitTextFillColor))continue;let range=document.createRange();range.selectNodeContents(node);for(const r of range.getClientRects()){let b=clipped(e,box(r));if(area(b))out.push({text:node.textContent.trim(),rect:b});}}return out};
 const canvasPaint=c=>{let b=box(c.getBoundingClientRect());if(!visible(c))return[];try{let ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('not a readable2dcanvas');let w=c.width,h=c.height,d=ctx.getImageData(0,0,w,h).data,colors=new Map();for(let i=0;i<d.length;i+=4){let key=`${d[i]},${d[i+1]},${d[i+2]},${d[i+3]}`;colors.set(key,(colors.get(key)||0)+1);}let bg=[...colors].sort((a,b)=>b[1]-a[1])[0]?.[0];let minX=w,minY=h,maxX=-1,maxY=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++){let i=(y*w+x)*4,key=`${d[i]},${d[i+1]},${d[i+2]},${d[i+3]}`;if(d[i+3]&&key!==bg){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}}return maxX<0?[]:[clipped(c,{x:b.x+minX*b.w/w,y:b.y+minY*b.h/h,w:(maxX-minX+1)*b.w/w,h:(maxY-minY+1)*b.h/h})];}catch(error){errors.push({element:id(c),reason:'canvas-foreground-unreadable',message:String(error)});return[]}};
 const svgPaint=e=>{let s=getComputedStyle(e),fill=s.fill!=='none'&&!transparent(s.fill),stroke=s.stroke!=='none'&&!transparent(s.stroke)&&Number(s.strokeWidth.replace('px',''))>0;if(!paintStyle(e)||!fill&&!stroke||e.tagName.toLowerCase()==='line'&&!stroke)return[];let b=box(e.getBoundingClientRect());if(stroke){let m=e.getScreenCTM(),sw=parseFloat(s.strokeWidth)||0,dx=sw*Math.hypot(m?.a??1,m?.b??0)/2,dy=sw*Math.hypot(m?.c??0,m?.d??1)/2;b={x:b.x-dx,y:b.y-dy,w:b.w+2*dx,h:b.h+2*dy};}return[clipped(e,b)]};
 const graphicRects=root=>{let out=[];if(root.matches?.('canvas'))out.push(...canvasPaint(root));for(const c of root.querySelectorAll('canvas'))out.push(...canvasPaint(c));
  // Background boxes, hit areas, wrapper padding and full-panel fills are NOT content.
  for(const s of root.querySelectorAll('svg path,svg line,svg polyline,svg polygon,svg circle,svg ellipse,svg text,[data-glyph-fn] svg rect'))out.push(...svgPaint(s));
  for(const e of root.querySelectorAll('img'))if(visible(e))out.push(clipped(e));return out.filter(area)};
 const controls=[...document.querySelectorAll('[data-param]')].filter(visible).map((e,i)=>({id:id(e)+'#'+i,param:e.getAttribute('data-param'),occurrence:e.getAttribute('data-param-occurrence'),rect:clipped(e)}));
 const glyphs=[...document.querySelectorAll('[data-glyph-fn]')].filter(visible).map((g,i)=>{let owner=g.closest('[data-param]'),label=owner?.querySelector('.parameter-caption');if(!label&&owner){label=[...owner.children].filter(e=>e!==g&&!e.matches('output,input,svg,canvas')&&!e.contains(g)&&!e.matches('[data-param-value]')).at(-1);}
  const ts=label?texts(label):[],paint=graphicRects(g);return{id:id(g)+'#'+i,param:owner?.getAttribute('data-param')??null,type:g.getAttribute('data-glyph-fn'),rect:clipped(g),paintRects:paint,caption:ts.map(t=>t.text).join(' ').trim(),captionPainted:ts.length>0,captionRects:ts.map(t=>t.rect)}});
 const panels=[...document.querySelectorAll('[data-structural-panel],.controls-screen,.source-sound-list,.encoder-grid,.sound-panel,.roll-panel,.source-scene')].filter(visible).map((p,i)=>({id:id(p)+'#'+i,rect:box(p.getBoundingClientRect()),visibleRect:clipped(p),contentRects:[...texts(p).map(t=>t.rect),...graphicRects(p)]}));
 return {screen:{id:(document.body.dataset.view||document.title)+'/'+(document.querySelector('#part')?.value||''),rect:viewport},controls,glyphs,panels,collectionErrors:errors,
  limitations:['DOM foreground geometry, not a screenshot visibility/occlusion audit.','Uniform canvas face color is excluded by exact modal-color foreground extraction.','Checks1/2 intentionally do not conflate different engine refs with similar glyph shapes.']};
}'''


def collect_structural(page):
    """Collect real sync-Playwright DOM evidence and apply all four detectors."""
    snapshot = page.evaluate(DOM_SNAPSHOT)
    result = analyze_snapshot(snapshot)
    result['limitations'] = snapshot.get('limitations', [])
    return result
