#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Record paused f178 dv_glyph paths for every qualified control setting."""
from pathlib import Path
import base64
import hashlib
import json
from struct import pack
import subprocess
import sys
import tempfile
import zlib
if len(sys.argv)!=4:
    sys.exit("usage: probe-drum-dv-glyphs.py F178_SOURCE GENERATED_HEADER_DIRECTORY FIXTURE_JSON")
fw,gen,fixture=map(lambda p:Path(p).resolve(),sys.argv[1:])
revision='f1786ebec2616477163b62b029c7e77405a9c3de'
inputs={
    'firmware/src/app/ui.c': '8f9b86dcbe801297cd0a60427c0e942f0536b03a9c7a3f40c99bf9b51cc24629',
    'firmware/src/app/ui_drum_voice.inc': '9fed48b3c5546014970ba7360f6b8ebb0ebca11a45dd7b379c0e7fd040256894',
    'firmware/src/dsp/drum909.c': 'f150f594e07a0caef363629146c8a5cca901ea6240ad728a79c0115bc7e75c41',
    'firmware/src/dsp/drum808.c': '52f894bbcaf54a77aed1d9368ed6595cb3641dcf80d7fd7b8e74ed16cde73680',
    'firmware/src/dsp/fastmath.h': 'c82737d5302d77b974d5071c9bc58915aca723a6e6f5f5185cbe43bad962189d',
    'firmware/src/dsp/x0x_param.c': '2b64d6929fa0fbe79772365a0436fbd2d838e5a9d3ad1e254b93f890ad340058',
    'x0x_drum_samples.h': '6fd7fe81e4af56afe59bc0fde462c5c237d1e86c332a3bb163a7f21eee619c50',
    'x0x_drum_tables.h': '9235c69643359a1d9e4f692e754d25e8b9a4014b9e41886eed995d8aaf100eb5',
}
for name,expected in inputs.items():
    path=(fw if name.startswith('firmware/') else gen)/name
    if hashlib.sha256(path.read_bytes()).hexdigest()!=expected:
        raise SystemExit(f'Unqualified source input: {name}')
dsp=fw/'firmware/src/dsp'
s=(fw/'firmware/src/app/ui_drum_voice.inc').read_text()
ui=(fw/'firmware/src/app/ui.c').read_text()
assert '#define OG_W 26' in ui and '#define OG_H 18' in ui
assert '{1.375f, 1.5f, 28, 56, 29}' in s
def section(start,end):
    return start+s.split(start,1)[1].split(end,1)[0]
sweep=section('static UI_DRAW float dv_sweep_level(', '/* Scale of the selected single-control')
tune=section('    if (role == DG_BDSWEEP)', '            /* X follows hit age.')
pitch=section('    if (d && name_is(d,"Pitch")) {','    if (role == DG_TUNE')
snappy=section('            n = 0;\n            for (i = 0; i <= 16; i++) {\n                float t = (float)i / 16.0f;\n                float envp','        }\n        return;\n    }')
sound=section('    /* fallback: a value-scaled arc */','\n}\n')
c=r'''
#include <assert.h>
#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include "drum909.h"
#include "drum808.h"
#include "fastmath.h"
#define UI_DRAW
#define OG_W 26
#define OG_H 18
#define C_LINE 0
#define T_909 0
#define R_ENG 1
#define PR(kind,a,b,c) ((pref_t){a,b,c})
typedef struct {int a,b,c;} pref_t;
enum {DG_BDSWEEP=1};
static int stored[6];
static int matrix_value(pref_t r){return stored[r.c];}
static float dg_si(pref_t r,int param,int raw){float x; assert(drum909_param_si(0,param,raw,&x));return x;}
#define engine_bd909_hz drum909_bd_hz
static int name_is(const x0x_param_t *d,const char *name){return strcmp(d->name,name)==0;}
static float dg_live_back(pref_t r,int live){return 1;}
static int blend(int c,int col,int a){return col;}
static int actual_x;
static void cv_rect(int x,int y,int w,int h,int col){printf(" %.9g %.9g %.9g %.9g",x/1.375,y/1.5,(x+w-1)/1.375,y/1.5);}
static void cv_line(int x,int y,int xx,int yy,int col){
 if(actual_x<0)printf(" %.9g %.9g",x/1.375,y/1.5);
 printf(" %.9g %.9g",xx/1.375,yy/1.5);actual_x=xx;
}
static void cv_poly_aa(float *xy,int n,int col){for(int j=0;j<2*n;j++)printf(" %.9g",xy[j]);}
'''+sweep+r'''
static void tune(int val){
 pref_t r=PR(R_ENG,T_909,0,0);int i,role=DG_BDSWEEP,live=0,col=1;uint32_t age=0;
 float ox=0,oy=0,sx=1.375f,sy=1.5f;actual_x=-1;
'''+tune+r'''
 }
 }
}
static void pitch(int val){
 pref_t r=PR(R_ENG,T_909,0,5);const x0x_param_t *d=drum909_param(0,5);
 float ox=0,oy=0,sx=1,sy=1,xy[80];int n,i,col=1;
'''+pitch+r'''
}
static void snappy(float q){
 float k=1,ox=0,oy=0,sx=1,sy=1,xy[80];int n,i,col=1;
'''+snappy+r'''
}
static void selector(float q){
 float ox=0,oy=0,sx=1,sy=1,xy[80];int n,i,col=1;
'''+sound+r'''
}
int main(void){
 const x0x_param_t *t=drum909_param(0,0),*depth=drum909_param(0,4),*p=drum909_param(0,5);
 assert(t->def==34 && depth->def==0 && p->def==45);
 assert(name_is(drum909_param(1,2),"Snappy") && name_is(drum808_param(1,2),"Snappy"));
 for(int group=0;group<3;group++){
  const int values[3][3]={{34,0,45},{18,64,32},{100,127,99}};
  stored[0]=values[group][0];stored[4]=values[group][1];stored[5]=values[group][2];
  for(int raw=0;raw<=127;raw++){
   printf("TUNE %d %d",group,raw);tune(raw);puts("");
   printf("PITCH %d %d",group,raw);pitch(raw);puts("");
  }
 }
 for(int kit=0;kit<2;kit++)for(int raw=0;raw<=127;raw++){
  printf("SNAPPY %d %d",kit,raw);snappy(raw/127.0f);puts("");
 }
 for(int voice=2;voice<=6;voice++)for(int raw=0;raw<=1;raw++){
  const x0x_param_t *d=drum808_param(voice,voice==6?4:3);
  assert(name_is(d,"Sound") && d->max==1 && d->names);
  printf("SOUND %d %d",voice,raw);selector((float)raw);puts("");
 }
}
'''
with tempfile.TemporaryDirectory(prefix='drum-dv-oracle-') as temp:
    out=Path(temp)
    source=out/'oracle.c'
    source.write_text(c)
    binary=out/'oracle'
    subprocess.run(['cc','-std=c11','-O2','-DX0X_HOST','-ffp-contract=off','-ffunction-sections',
        '-fdata-sections',f'-I{dsp}',f'-I{gen}',str(source),str(dsp/'drum909.c'),
        str(dsp/'drum808.c'),str(dsp/'x0x_param.c'),'-Wl,--gc-sections','-o',str(binary)],check=True)
    data=subprocess.check_output([binary])

rows=data.decode('ascii').splitlines()
points=[round(float(v)*1000) for line in rows for v in line.split()[3:]]
packed=pack('<'+'H'*len(points),*points)
fixture.write_text(json.dumps({
    'firmware':revision,
    'nativeOutputSHA256':hashlib.sha256(data).hexdigest(),
    'rows':len(rows),
    'coordinates':len(points),
    'encoding':'zlib, u16 little-endian, 1/1000 source unit',
    'values':base64.b64encode(zlib.compress(packed,9)).decode('ascii'),
},indent=2)+'\n')
