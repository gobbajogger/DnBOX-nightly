from pathlib import Path
import hashlib,json,tempfile,subprocess,shutil
r=Path(__file__).resolve().parent;src=r.parent/'glyph-sweep-work/native/firmware/src'
def get(p,h):
 b=(src/p).read_bytes();assert hashlib.sha256(b).hexdigest()==h;return b
ui=get('app/ui_drum_voice.inc','7386bab5b37ca6583ab8e956e7a0e867c166c7a0c64d0c8d43bcefc0fe00fdb3').decode()
drum=get('dsp/drum909.c','d558f150acfafa82eb5cc7fdd1d384e8bb18b3cf773032507cad3ff3675df584').decode()
math=get('dsp/fastmath.h','fbe052086010b17d8194b9cd3d61d3cb349cc1def3817ae9651a6683d7850b09')
body=ui[ui.index('static UI_DRAW void dv_tune_fork'):ui.index('static UI_DRAW void dv_value_text')]
bd=drum[drum.index('X0X_COLD float drum909_bd_hz'):drum.index('/* UI glyph motion:')]
pre=r'''#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include "fastmath.h"
#define UI_DRAW
#define X0X_COLD
#define D9_BD_BASE_HZ 49.0f
#define D9_BD_DF_PER_MS 4.6f
#define D9_BD_PHOLD_MS 16.0f
#define DG_DECAY 1
#define DG_NTAIL 2
#define DG_TUNE 3
#define DG_BDSWEEP 4
#define DG_ATTACK 5
#define DG_LPF 6
#define DG_SHELLS 7
#define DG_SNAPPY 8
#define DG_ACCENT 10
#define R_ENG 1
#define T_909 0
#define X0X_U_MS 4
#define X0X_U_S 5
#define C_WHITE 65535
#define PR(k,a,b,c) ((pref_t){k,a,b,c})
typedef struct{int kind,a,b,c;}pref_t;
typedef struct{int max;const char*name;}x0x_param_t;
static x0x_param_t descriptor;static int role,paths,unit;static float selected_si,tau,depth,pitch;
static int drum_strip_role(pref_t r){return role;}
static const x0x_param_t*pref_desc(pref_t r){return &descriptor;}
static int name_is(const x0x_param_t*d,const char*n){return !strcmp(d->name,n);}
static int drum_live(pref_t r,uint32_t*a,float*e){*a=0xffffffffu;*e=0;return 0;}
static int matrix_value(pref_t r){return 0;}
static int engine_param_si(int a,int b,int c,int val,float*out){*out=selected_si;return unit;}
static float dg_si(pref_t r,int c,int val){return c==0?tau:c==4?depth:pitch;}
static void cv_poly_aa(float*xy,int n,int col){printf("%s[",paths++?",":"");for(int i=0;i<n;i++)printf("%s[%.9g,%.9g]",i?",":"",xy[i*2],xy[i*2+1]);printf("]");}
static void cv_line_aa(float a,float b,float c,float d,int col){float xy[]={a,b,c,d};cv_poly_aa(xy,2,col);}
#define engine_bd909_hz drum909_bd_hz
'''
post=r'''int main(void){char name[32];int target,slot,max;float ev;while(scanf("%d %d %d %d %31s %f %d %f %f %f %f",&target,&slot,&role,&max,name,&ev,&unit,&selected_si,&tau,&depth,&pitch)==11){descriptor.max=max;descriptor.name=name;paths=0;printf("[");dv_glyph((pref_t){1,target,0,slot},ev,8,8,1.375f,1.5f,0);puts("]");}return 0;}'''
code=(pre+bd+body+post).encode();captured={'reference.c':code,'fastmath.h':math}
with tempfile.TemporaryDirectory(prefix='dnbox-presentation-')as td:
 t=Path(td)
 for p,b in captured.items():(t/p).write_bytes(b)
 subprocess.run(['cc','-O2','-ffp-contract=off',str(t/'reference.c'),'-o',str(t/'reference')],check=True,timeout=30)
 for p,b in captured.items():assert (t/p).read_bytes()==b
 shutil.copyfile(t/'reference',r/'reference');(r/'reference').chmod(0o755)
(r/'reference-pins.json').write_text(json.dumps({'binary':hashlib.sha256((r/'reference').read_bytes()).hexdigest()},indent=2)+'\n')
