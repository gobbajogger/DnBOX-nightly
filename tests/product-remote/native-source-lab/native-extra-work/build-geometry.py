from pathlib import Path
import hashlib,tempfile,subprocess,shutil,json
r=Path(__file__).resolve().parent;src=r.parent/'glyph-sweep-work/native/firmware/src'
def get(p,h):
 b=(src/p).read_bytes();assert hashlib.sha256(b).hexdigest()==h;return b
ui=get('app/ui_drum_voice.inc','7386bab5b37ca6583ab8e956e7a0e867c166c7a0c64d0c8d43bcefc0fe00fdb3').decode();math=get('dsp/fastmath.h','fbe052086010b17d8194b9cd3d61d3cb349cc1def3817ae9651a6683d7850b09')
body=ui[ui.index('    if (role == DG_LPF)'):ui.index('static UI_DRAW void dv_value_text')]
pre='''#include <stdio.h>
#include "fastmath.h"
#define DG_LPF 6
#define DG_SHELLS 7
#define DG_SNAPPY 8
#define DG_ACCENT 10
static int paths;
static void cv_poly_aa(float*xy,int n,int col){(void)col;printf("%s[",paths++?",":"");for(int i=0;i<n;i++)printf("%s[%.9g,%.9g]",i?",":"",xy[i*2],xy[i*2+1]);printf("]");}
static void cv_line_aa(float x0,float y0,float x1,float y1,int col){float xy[]={x0,y0,x1,y1};cv_poly_aa(xy,2,col);}
static void glyph(int role,float ev,float max,float ox,float oy,float sx,float sy){int i,n,live=0,col=0;float e=0,q=ev/max,xy[80];
'''
post='''int main(void){int role;float raw,max,x,y,sx,sy;while(scanf("%d %f %f %f %f %f %f",&role,&raw,&max,&x,&y,&sx,&sy)==7){paths=0;printf("[");glyph(role,raw,max,x,y,sx,sy);puts("]");}return 0;}
'''
code=(pre+body+post).encode();captured={'geometry.c':code,'fastmath.h':math}
with tempfile.TemporaryDirectory(prefix='dnbox-extra-')as tmp:
 t=Path(tmp)
 for p,b in captured.items():(t/p).write_bytes(b)
 def verify():
  for p,b in captured.items():assert (t/p).read_bytes()==b
 verify();subprocess.run(['cc','-O2','-ffp-contract=off',str(t/'geometry.c'),'-o',str(t/'geometry')],check=True,timeout=30);verify();shutil.copyfile(t/'geometry',r/'geometry');(r/'geometry').chmod(0o755)
(r/'geometry.c').write_bytes(code);(r/'geometry-pins.json').write_text(json.dumps({'binarySha256':hashlib.sha256((r/'geometry').read_bytes()).hexdigest(),'sourceSha256':{p:hashlib.sha256(b).hexdigest() for p,b in captured.items()}},indent=2)+'\n')
