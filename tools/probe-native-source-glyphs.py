# SPDX-License-Identifier: GPL-3.0-only
"""Compile the exact f178 idle branches and record native drawing calls."""
from pathlib import Path
import hashlib
import subprocess
import sys

fw, gen, out = map(lambda s: Path(s).resolve(), sys.argv[1:])
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=fw,text=True).strip() == 'f1786ebec2616477163b62b029c7e77405a9c3de'
subprocess.run(['git','diff','--quiet','HEAD','--','firmware/src/app','firmware/src/dsp'],cwd=fw,check=True)
out.mkdir(parents=True,exist_ok=True)
dsp = fw/'firmware/src/dsp'
app = fw/'firmware/src/app'
src = (app/'ui_drum_voice.inc').read_text()
ui = (app/'ui.c').read_text()
assert 'return k9?(r.b==1 /* SD */?DG_NTAIL:DG_NONE):r.b==0?DG_LPF:r.b==1?DG_SHELLS:DG_NONE;' in ui
tail = src[src.index('    if (role == DG_DECAY || role == DG_NTAIL) {'):].split('        float back=dg_live_back',1)[0]
shell = src[src.index('        if (role == DG_SHELLS) {'):].split('        } else {',1)[0]
pitch = ui[ui.index('static UI_DRAW int control_glyph('):].split('    } else if(r.kind==R_DLEN',1)[0]
pitch = pitch.replace('static UI_DRAW int','static int',1)
code = r'''
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include "drum909.h"
#include "fastmath.h"
enum {T_909=0,T_BRK=3,T_MST=4,R_ENG,R_BTRANS,DG_DECAY,DG_NTAIL,DG_SHELLS,MST_DJF};
enum {C_LINE,C_GRAY};
typedef struct {int a,b,c,kind;} pref_t;
static int engine_param_si(int kit, int voice,int parameter,int raw,float *ms) {
    assert(kit==T_909);
    return drum909_param_si(voice,parameter,raw,ms);
}
static void noise(pref_t r,float ev) {
    float ox=0,oy=0,sx=1,sy=1,xy[80],q=ev/127.0f;
    int role=DG_NTAIL,val=(int)(ev+.5f),n,i;
''' + tail + r'''
    assert(uu==X0X_U_MS);
    printf("%.9g",ms);
    for(i=0;i<2*n;i++) printf(" %.9g",xy[i]);
    }
}
static void cv_line_aa(float x,float y,float x2,float y2,int col) {
    printf(" %.9g %.9g %.9g %.9g",x,y,x2,y2);
}
static void shells(float ev) {
    float ox=0,oy=0,sx=1,sy=1,k=1;
    int role=DG_SHELLS,col=2;
''' + shell + r'''
    }
}
static int is_pan(pref_t r){return 0;}
static int all_glyph_semantics(pref_t r,int val,int cx,uint16_t col){return 0;}
static int semantic_amount_glyph(pref_t r,int val,int cx,uint16_t col){return 0;}
static const x0x_param_t *pref_desc(pref_t r){
    static const x0x_param_t pitch={"Pitch",24,12,0};
    assert(r.a==T_BRK && r.c==1);
    return &pitch;
}
static void cv_rect(int x,int y,int w,int h,int col){
    printf(" %d %d %d %d %d",x,y,w,h,col);
}
''' + pitch + r'''
    }
    return 1;
}
int main(void){
    for(int role=0;role<3;role++){
      for(int raw=0;raw<=(role==2?24:127);raw++){
        printf("%d %d ",role,raw);
        if(role==0)noise((pref_t){T_909,1,1,R_ENG},raw);
        if(role==1)shells(raw);
        if(role==2)control_glyph((pref_t){T_BRK,0,1,R_ENG},raw,20,2);
        putchar('\n');
      }
    }
}
'''
(out/'oracle.c').write_text(code)
binary=out/'oracle.bin'
subprocess.run(['cc','-std=c11','-O2','-DX0X_HOST','-ffp-contract=off','-ffunction-sections',
    '-fdata-sections',f'-I{dsp}',f'-I{gen}',str(out/'oracle.c'),
    str(dsp/'drum909.c'),str(dsp/'x0x_param.c'),'-Wl,--gc-sections','-o',str(binary)],check=True)
data=subprocess.check_output([binary])
(out/'glyph-native.txt').write_bytes(data)
print('native rows',len(data.splitlines()),hashlib.sha256(data).hexdigest())
