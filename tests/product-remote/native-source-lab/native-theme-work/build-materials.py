from pathlib import Path
import hashlib,json,re
r=Path(__file__).resolve().parent
pins={'ui.c':'fcda221227e641b94fdaac03ab2af171d56ddc9176acd3f65189f7801cecbb1c','ui_drum_voice.inc':'55038d61d8c7e68e7421866b69e8245011c883fc9ca2d3dd806123c5f97091e5','ui_theme.h':'2576702222d15a535dc943184ea103b86a29c4f621824e26c215e7199c19883e'}
sources={name:(r/'source'/name).read_bytes()for name in pins}
for name,b in sources.items():assert hashlib.sha256(b).hexdigest()==pins[name]
def rows(s,start,end,counts):
 t=s[s.index(start):s.index(end,s.index(start))];a=[[(int(r)>>3)<<11|(int(g)>>2)<<5|(int(b)>>3)for r,g,b in re.findall(r'RGB\((\d+),(\d+),(\d+)\)',row)]for row in re.findall(r'\{([^{}]+)\}',t)];assert [len(x)for x in a]==counts;return a
materials=rows(sources['ui_theme.h'].decode(),'static const uint16_t ui_material','#define UI_N_BASE',[16,16])
parts=rows(sources['ui.c'].decode(),'static const uint16_t PART_COLOURS','#define PART_COL',[5,5])
assert 'ui_theme_light?SOUND_SELECT:RGB(36,48,54)' in sources['ui_drum_voice.inc'].decode()
(r/'materials.json').write_text(json.dumps({'productionSource':'34ad78a76f963276de31de50c85f08a20af01f8a','sourceSHA256':pins,'materials':materials,'parts':parts},indent=2)+'\n')
