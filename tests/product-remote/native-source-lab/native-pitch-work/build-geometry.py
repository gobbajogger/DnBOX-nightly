from pathlib import Path
import hashlib,tempfile,subprocess,shutil,json
r=Path(__file__).resolve().parent;src=r.parent/'glyph-sweep-work/native/firmware/src'
def get(p,h):
 b=(src/p).read_bytes();assert hashlib.sha256(b).hexdigest()==h,p;return b
ui=get('app/ui_drum_voice.inc','7386bab5b37ca6583ab8e956e7a0e867c166c7a0c64d0c8d43bcefc0fe00fdb3').decode();drum=get('dsp/drum909.c','d558f150acfafa82eb5cc7fdd1d384e8bb18b3cf773032507cad3ff3675df584').decode();math=get('dsp/fastmath.h','fbe052086010b17d8194b9cd3d61d3cb349cc1def3817ae9651a6683d7850b09')
bd=drum[drum.index('X0X_COLD float drum909_bd_hz'):drum.index('/* UI glyph motion:')]
pitch=ui[ui.index('    if (d && name_is(d,"Pitch"))'):ui.index('    if (role == DG_TUNE')];depth=ui[ui.index('    if (role == DG_BDSWEEP)'):ui.index('    if (role == DG_LPF)')]
pre='''#include <stdio.h>
#include "fastmath.h"
#define X0X_COLD
#define D9_BD_BASE_HZ 49.0f
#define D9_BD_DF_PER_MS 4.6f
#define D9_BD_PHOLD_MS 16.0f
#define DG_BDSWEEP 4
#define PR(...) 0
#define matrix_value(...) 0
#define name_is(...) 1
static float si[6];
typedef struct{int c;}pref_t;
static float dg_si(pref_t r,int c,int pot){(void)r;(void)pot;return si[c];}
static void cv_poly_aa(float*xy,int n,int col){(void)col;printf("[[");for(int i=0;i<n;i++)printf("%s[%.9g,%.9g]",i?",":"",xy[2*i],xy[2*i+1]);puts("]]");}
'''
post='''#define engine_bd909_hz drum909_bd_hz
static void glyph(int family,float ox,float oy,float sx,float sy){pref_t r={family?4:5};int d=!family,role=DG_BDSWEEP,val=0,n=0,i,col=0;float xy[80];
'''+pitch+depth+'''}
int main(void){int family;float x,y,sx,sy;while(scanf("%d %f %f %f %f %f %f %f",&family,&si[0],&si[4],&si[5],&x,&y,&sx,&sy)==8)glyph(family,x,y,sx,sy);return 0;}
'''
code=(pre+bd+post).encode();captured={'geometry.c':code,'fastmath.h':math}
with tempfile.TemporaryDirectory(prefix='dnbox-dependent-')as temp:
 t=Path(temp)
 for p,b in captured.items():(t/p).write_bytes(b)
 def verify():
  for p,b in captured.items():assert (t/p).read_bytes()==b
 verify();subprocess.run(['cc','-O2','-ffp-contract=off',str(t/'geometry.c'),'-o',str(t/'geometry')],check=True,timeout=30);verify();shutil.copyfile(t/'geometry',r/'geometry');(r/'geometry').chmod(0o755)
(r/'geometry.c').write_bytes(code);(r/'geometry-pins.json').write_text(json.dumps({'binarySha256':hashlib.sha256((r/'geometry').read_bytes()).hexdigest(),'sourceSha256':{p:hashlib.sha256(b).hexdigest() for p,b in captured.items()}},indent=2)+'\n')
