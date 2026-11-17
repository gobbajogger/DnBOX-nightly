from pathlib import Path
import hashlib,subprocess,tempfile,shutil,json
r=Path(__file__).resolve().parent;src=r.parent/'glyph-sweep-work/native/firmware/src'
def read(p,h):
 b=(src/p).read_bytes();assert hashlib.sha256(b).hexdigest()==h;return b
header=read('app/ui_glyph_renderer.h','ebee44c751965bf29734fc98e8b984c7841c94b9b23ad73d77f1b28fd69a0b20').decode();math=read('dsp/fastmath.h','fbe052086010b17d8194b9cd3d61d3cb349cc1def3817ae9651a6683d7850b09')
decls=header[header.index('#define UI_EASE_OMEGA'):header.index('static void ui_ease_reset')];tick=header[header.index('static void ui_ease_tick'):header.index('static float ui_ease_float')]
pre='''#include <stdio.h>
#include <stdint.h>
#include "fastmath.h"
typedef struct{int kind,a,b,c;} pref_t;
static uint32_t clock_ms;static uint32_t plat_ms(void){return clock_ms;}
'''
post='''int main(void){float y,vel;int target;unsigned elapsed;while(scanf("%f %f %d %u",&y,&vel,&target,&elapsed)==4){ui_ease[0].on=1;ui_ease[0].y=y;ui_ease[0].vel=vel;ui_ease[0].tgt=target;ui_ease_last_ms=0;ui_ease_clock_on=1;clock_ms=elapsed;ui_ease_tick();printf("[%.9g,%.9g]\\n",ui_ease[0].y,ui_ease[0].vel);}return 0;}
'''
code=(pre+decls+tick+post).encode();captured={'reference.c':code,'fastmath.h':math}
with tempfile.TemporaryDirectory(prefix='dnbox-ease-') as tmp:
 t=Path(tmp)
 for p,b in captured.items():(t/p).write_bytes(b)
 def verify():
  for p,b in captured.items():assert (t/p).read_bytes()==b
 verify();subprocess.run(['cc','-std=c11','-O2','-ffp-contract=off',str(t/'reference.c'),'-o',str(t/'reference')],check=True,timeout=30);verify();shutil.copyfile(t/'reference',r/'reference');(r/'reference').chmod(0o755)
(r/'reference.c').write_bytes(code);(r/'reference-pins.json').write_text(json.dumps({'binarySha256':hashlib.sha256((r/'reference').read_bytes()).hexdigest(),'sourceSha256':{k:hashlib.sha256(v).hexdigest() for k,v in captured.items()}},indent=2)+'\n')
