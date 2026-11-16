from pathlib import Path
import hashlib,subprocess,tempfile,shutil,json
r=Path(__file__).resolve().parent;src=r.parent/'glyph-sweep-work/native/firmware/src'
def read(p,h):
 b=(src/p).read_bytes();assert hashlib.sha256(b).hexdigest()==h,p;return b
ui=read('app/ui.c','892773492da1ecd7d2084a0e6ea0ac1d0e9dfbe2d0c4482f9130d0fccb762101').decode()
math=read('dsp/fastmath.h','fbe052086010b17d8194b9cd3d61d3cb349cc1def3817ae9651a6683d7850b09')
header=read('app/ui_glyph_renderer.h','ebee44c751965bf29734fc98e8b984c7841c94b9b23ad73d77f1b28fd69a0b20').decode()
px=ui[ui.index('static void px_blend('):ui.index('#include "ui_glyph_renderer.h"')]
stroke=header[header.index('static X0X_COLD'):header.index('#define UI_EASE_OMEGA')]
pre='''#include <stdio.h>
#include <stdint.h>
#include "fastmath.h"
#define X0X_COLD
static uint16_t cv_px[512*512];static unsigned char output[512*512*2];static uint32_t cv_w;static int cv_y0,cv_y1,cv_oy;
static uint16_t swap16(uint16_t x){return (uint16_t)((x>>8)|(x<<8));}
'''
post='''int main(void){unsigned w,h,bg,ink,np;while(scanf("%u %u %u %u %u",&w,&h,&bg,&ink,&np)==5){if(w>512||h>512||!w||!h)return 2;cv_w=w;cv_y0=0;cv_y1=h;cv_oy=0;for(unsigned i=0;i<w*h;i++)cv_px[i]=swap16(bg);for(unsigned p=0;p<np;p++){unsigned n;float xy[256];if(scanf("%u",&n)!=1||n>128)return 3;for(unsigned j=0;j<n*2;j++)if(scanf("%f",&xy[j])!=1)return 4;cv_poly_aa(xy,n,ink);}for(unsigned i=0;i<w*h;i++){uint16_t c=swap16(cv_px[i]);output[2*i]=c>>8;output[2*i+1]=c&255u;}if(fwrite(output,2,w*h,stdout)!=w*h)return 5;}return 0;}
'''
code=(pre+px+stroke+post).encode();captured={'reference.c':code,'fastmath.h':math}
with tempfile.TemporaryDirectory(prefix='dnbox-raster-') as tmp:
 t=Path(tmp)
 for name,b in captured.items():(t/name).write_bytes(b)
 def verify():
  for name,b in captured.items():assert (t/name).read_bytes()==b
 verify();subprocess.run(['cc','-std=c11','-O2','-ffp-contract=off',str(t/'reference.c'),'-o',str(t/'reference')],check=True,timeout=30);verify();shutil.copyfile(t/'reference',r/'reference');(r/'reference').chmod(0o755)
(r/'reference.c').write_bytes(code);(r/'reference-pins.json').write_text(json.dumps({'binarySha256':hashlib.sha256((r/'reference').read_bytes()).hexdigest(),'sourceSha256':{k:hashlib.sha256(v).hexdigest() for k,v in captured.items()},'rendererSha256':hashlib.sha256(header.encode()).hexdigest()},indent=2)+'\n')
