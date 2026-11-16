from pathlib import Path
import hashlib,tempfile,subprocess,shutil,json
r=Path(__file__).resolve().parent;src=r.parent/'glyph-sweep-work/native/firmware/src'
def get(p,h):
 b=(src/p).read_bytes();assert hashlib.sha256(b).hexdigest()==h;return b
header=get('app/ui_glyph_renderer.h','ebee44c751965bf29734fc98e8b984c7841c94b9b23ad73d77f1b28fd69a0b20').decode();math=get('dsp/fastmath.h','fbe052086010b17d8194b9cd3d61d3cb349cc1def3817ae9651a6683d7850b09');body=header[header.index('#define UI_EASE_OMEGA'):header.rindex('#endif')]
pre='''#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include "fastmath.h"
#define R_ENG 1
#define T_303 2
typedef struct{uint8_t kind,a,b,c;}pref_t;
static struct{uint32_t frame;}ui;
static uint32_t clock_ms;static int bank_tag;
static uint32_t plat_ms(void){return clock_ms;}
static int engine_bass_bank(int v){(void)v;return bank_tag;}
'''
post=r'''
int main(void){char line[256];while(fgets(line,sizeof line,stdin)){unsigned now,k,a,b,c,frame,bank;int target,has_value=0;float value=0;if(line[0]=='R'){if(sscanf(line+1,"%u",&now)!=1)return 2;clock_ms=now;ui_ease_reset();}else if(line[0]=='T'){if(sscanf(line+1,"%u",&now)!=1)return 3;clock_ms=now;ui_ease_tick();}else if(line[0]=='V'){if(sscanf(line+1,"%u %u %u %u %d %u %u",&k,&a,&b,&c,&target,&frame,&bank)!=7)return 4;ui.frame=frame;bank_tag=bank;pref_t id={(uint8_t)k,(uint8_t)a,(uint8_t)b,(uint8_t)c};value=ui_ease_float(id,target);has_value=1;}else return 5;
 printf("{\"value\":");if(has_value)printf("%.9g",value);else printf("null");printf(",\"last\":%u,\"clockOn\":%u,\"signature\":%u,\"slots\":[",ui_ease_last_ms,ui_ease_clock_on,ui_ease_sig());for(int i=0;i<16;i++){ui_ease_t*e=&ui_ease[i];if(i)printf(",");if(!e->on){printf("null");continue;}printf("[%.9g,%.9g,%d,%u,%u,%u,%u,%u,%u]",e->y,e->vel,e->tgt,e->seen,e->family,e->r.kind,e->r.a,e->r.b,e->r.c);}puts("]}");}return 0;}
'''
code=(pre+body+post).encode();captured={'reference.c':code,'fastmath.h':math}
with tempfile.TemporaryDirectory(prefix='dnbox-cache-')as tmp:
 t=Path(tmp)
 for p,b in captured.items():(t/p).write_bytes(b)
 def verify():
  for p,b in captured.items():assert (t/p).read_bytes()==b
 verify();subprocess.run(['cc','-O2','-ffp-contract=off',str(t/'reference.c'),'-o',str(t/'reference')],check=True,timeout=30);verify();shutil.copyfile(t/'reference',r/'reference');(r/'reference').chmod(0o755)
(r/'reference.c').write_bytes(code);(r/'reference-pins.json').write_text(json.dumps({'binarySha256':hashlib.sha256((r/'reference').read_bytes()).hexdigest(),'sourceSha256':{p:hashlib.sha256(b).hexdigest() for p,b in captured.items()}},indent=2)+'\n')
