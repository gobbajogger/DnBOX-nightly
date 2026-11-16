from pathlib import Path
import hashlib,json,tempfile,subprocess,shutil
r=Path(__file__).resolve().parent
pins={
 r.parent/'native-body-work/source-ui_drum_voice.inc':'a669c3c03c19204bd26eda0bf59b2f33f43a52da8beb718df8da24ee10b45353',
 r.parent/'glyph-sweep-work/native/firmware/src/app/ui.c':'892773492da1ecd7d2084a0e6ea0ac1d0e9dfbe2d0c4482f9130d0fccb762101',
 r/'source-gfx.c':'3efcbeafea44c2754cca3d43bf32aeec70ddc57f49e7344f2931cc165b909fab',
 r/'ui_theme.h':'2576702222d15a535dc943184ea103b86a29c4f621824e26c215e7199c19883e'}
inputs={p:p.read_bytes() for p in pins}
for p,b in inputs.items():assert hashlib.sha256(b).hexdigest()==pins[p],p
full,ui,gfx,theme=inputs.values();s=full.decode();u=ui.decode()
body=(s[s.index('static const uint16_t DV_XY'):s.index('/* R22 layout')]+s[s.index('static UI_DRAW void dv_body_pictogram'):s.index('/* TUNE fork')]).encode()
blend=u[u.index('static uint16_t blend('):u.index('static uint16_t part_col(')].encode()
defines='\n'.join(line for line in gfx.decode().splitlines() if line.startswith('#define RGB(') or line.startswith('#define C_WHITE '))+'\n'
assert len(defines.splitlines())==2
pre=r'''#include <stdio.h>
#include <stdint.h>
__SOURCE_COLOR_DEFINES__
#include "ui_theme.h"
#define UI_DRAW
#define T_808 1
#define T_909 0
#define NDRUM 11
static int count;
static void cv_stroke_aa(float a,float b,float c,float d,float w,uint16_t ink){printf("%s[%.9g,%.9g,%.9g,%.9g,%.9g,%u]",count++?",":"",a,b,c,d,w,ink);}
'''
post=r'''int main(void){int kit,voice,x,y;unsigned ink;float scale,env;while(scanf("%d %d %d %d %f %f %u",&kit,&voice,&x,&y,&scale,&env,&ink)==7){count=0;printf("[");dv_body_pictogram(kit,voice,x,y,scale,env,ink);puts("]");}return 0;}'''
captured={'reference.c':pre.replace('__SOURCE_COLOR_DEFINES__',defines).encode()+blend+body+post.encode(),'ui_theme.h':theme}
with tempfile.TemporaryDirectory(prefix='dnbox-body-live-')as td:
 t=Path(td)
 for p,b in captured.items():(t/p).write_bytes(b)
 def verify():
  for p,b in captured.items():assert (t/p).read_bytes()==b,p
 verify()
 subprocess.run(['cc','-O2','-ffp-contract=off',str(t/'reference.c'),'-o',str(t/'reference')],check=True,timeout=30)
 verify()
 shutil.copyfile(t/'reference',r/'reference');(r/'reference').chmod(0o755)
(r/'reference-pins.json').write_text(json.dumps({'binary':hashlib.sha256((r/'reference').read_bytes()).hexdigest(),'inputs':{p.name:h for p,h in pins.items()},'staged':{p:hashlib.sha256(b).hexdigest() for p,b in captured.items()}})+'\n')
