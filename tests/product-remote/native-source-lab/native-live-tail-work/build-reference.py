from pathlib import Path
import hashlib,json,tempfile,subprocess,shutil
r=Path(__file__).resolve().parent
pins={r/'source/ui.c':'a01c6ffecd57344d34f9b7a52ca3e95487d376b693600ad60532a1977a8741a6',r/'source/ui_drum_voice.inc':'12caba98f569f7fdc0ecb2fc5febb6853f2b38ba769ee31a8949c8c5684fd56a',r.parent/'glyph-sweep-work/native/firmware/src/dsp/fastmath.h':'fbe052086010b17d8194b9cd3d61d3cb349cc1def3817ae9651a6683d7850b09'}
captured_source={p:p.read_bytes()for p in pins}
for p,b in captured_source.items():assert hashlib.sha256(b).hexdigest()==pins[p]
u,body,math=captured_source.values();u=u.decode();body=body.decode()
helpers='\n'.join(line for line in u.splitlines()if line.startswith('static UI_DRAW int dg_rnd(')or line.startswith('static UI_DRAW int dg_tail_px('));assert len(helpers.splitlines())==2
head=body[body.index('static UI_DRAW void dv_glyph'):body.index('    if (d && name_is(d,"Pitch"))')]
branch=body[body.index('    if (role == DG_DECAY || role == DG_NTAIL) {'):body.index('    if (role == DG_BDSWEEP)')]
pre=r'''#include <stdio.h>
#include <stdint.h>
#include "fastmath.h"
#define UI_DRAW
#define DG_DECAY 1
#define DG_NTAIL 2
#define T_909 0
#define X0X_U_MS 4
#define X0X_U_S 5
#define OG_H 18
#define C_WHITE white_color
#define C_LINE line_color
typedef struct{int kind,a,b,c;}pref_t;typedef struct{int max;}x0x_param_t;
static x0x_param_t desc;static int role,unit,is_live,paths;static float selected_si,env,back;static uint32_t age;static uint16_t line_color,white_color;
static int drum_strip_role(pref_t r){return role;}static const x0x_param_t*pref_desc(pref_t r){return &desc;}
static int drum_live(pref_t r,uint32_t*a,float*e){*a=age;*e=env;return is_live;}
static int engine_param_si(int a,int b,int c,int raw,float*out){*out=selected_si;return unit;}
static float dg_live_back(pref_t r,int live){return back;}
static uint16_t blend(uint16_t a,uint16_t b,int t){int r=((a>>11)*(16-t)+(b>>11)*t)>>4,g=(((a>>5)&63)*(16-t)+((b>>5)&63)*t)>>4,bl=((a&31)*(16-t)+(b&31)*t)>>4;return(r<<11)|(g<<5)|bl;}
static void cv_poly_aa(float*xy,int n,int col){printf("%s{\"ink\":%d,\"points\":[",paths++?",":"",col);for(int i=0;i<n;i++)printf("%s[%.9g,%.9g]",i?",":"",xy[2*i],xy[2*i+1]);printf("]}");}
static void cv_line_aa(float a,float b,float c,float d,int col){float xy[]={a,b,c,d};cv_poly_aa(xy,2,col);}
'''
# Use actual blend bytes, not the fixture transcription.
a=pre.index('static uint16_t blend(');b=pre.index('static void cv_poly_aa',a);pre=pre[:a]+u[u.index('static uint16_t blend('):u.index('static uint16_t part_col(')]+pre[b:]
post=r'''int main(void){int target;float raw;unsigned ink,line,white;while(scanf("%d %d %f %d %d %f %d %f %u %f %u %u %u",&target,&role,&raw,&desc.max,&unit,&selected_si,&is_live,&env,&age,&back,&ink,&line,&white)==13){paths=0;line_color=line;white_color=white;printf("[");dv_glyph((pref_t){1,target,0,0},raw,8,8,1.375f,1.5f,ink);puts("]");}return 0;}'''
staged={'reference.c':(pre+helpers+head+branch+'}\n'+post).encode(),'fastmath.h':math}
with tempfile.TemporaryDirectory(prefix='dnbox-live-tail-')as td:
 t=Path(td)
 for p,b in staged.items():(t/p).write_bytes(b)
 def verify():
  for p,b in staged.items():assert (t/p).read_bytes()==b
 verify();subprocess.run(['cc','-O2','-ffp-contract=off',str(t/'reference.c'),'-o',str(t/'reference')],check=True,timeout=30);verify();shutil.copyfile(t/'reference',r/'reference');(r/'reference').chmod(0o755)
(r/'reference-pins.json').write_text(json.dumps({'binary':hashlib.sha256((r/'reference').read_bytes()).hexdigest(),'inputs':{str(p.name):h for p,h in pins.items()},'staged':{p:hashlib.sha256(b).hexdigest()for p,b in staged.items()}},indent=2)+'\n')
