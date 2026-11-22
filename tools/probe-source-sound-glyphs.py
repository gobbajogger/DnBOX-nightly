#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Generate a fixture from the exact idle f178 Chicago/Miami panel paths."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import zlib
import base64

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('firmware', type=Path)
p.add_argument('output', type=Path)
p.add_argument('--module', type=Path, help='Regenerate the independent glyph rows in the source module')
a = p.parse_args()
fw = a.firmware.resolve()
revision = subprocess.check_output(['git', '-C', fw, 'rev-parse', 'HEAD'], text=True).strip()
assert revision == 'f1786ebec2616477163b62b029c7e77405a9c3de'
subprocess.run(['git','-C',fw,'diff','--quiet','HEAD','--','firmware/src','experiments/original_synth'],check=True)
ui = (fw/'firmware/src/app/ui.c').read_text()
def take(start, end):
    return start + ui.split(start, 1)[1].split(end, 1)[0]

matrix = take('static UI_DRAW void matrix_glyph(int x,int y,int glyph,uint16_t c,uint16_t bg)\n{', '#if X0X_BASS_PRESET_PREVIEW')
waves = take('static UI_DRAW void orig_fx_glyph(', 'static float og_rate_hold(') + take('static float og_crush(', 'static UI_DRAW int og_states(')
common = take('#define ENV_FALL 4', '/* One second of the compact PWM oscillator')
strip = take('static UI_DRAW void orig_strip_glyph(pref_t r,int val,int gx,int gy,uint16_t col)\n{', '/* ---- 909 / 808 part-page glyphs')
main = r'''
#include <stdio.h>
#include <stdint.h>
#include <assert.h>
#include "fastmath.h"
#define UI_DRAW
#define X0X_ORIGINAL_SYNTH 1
#define OG_W 26
#define OG_H 18
#define NBASS 2
#define ORIGINAL_SOUND_CHICAGO 0
#define ORIGINAL_SOUND_MIAMI 1
#define ORIGINAL_SOUND_JUNO 3
#define ORIGINAL_SOUND_SYNTHONE 2
#define ORIGINAL_SYNTHONE_CRUSH 9
#define R_ENG 1
#define T_303 2
#define C_LINE 1
#define C_WHITE 2
#define INK 3
typedef struct{int a,b,c,kind;} pref_t;
#define PR(k,a,b,c) ((pref_t){a,b,c,k})
typedef struct{int max;} x0x_param_t;
typedef struct{unsigned shape[3];} ui_original_control_view;
enum {GL_NONE,GL_POWER,GL_DOWN,GL_UP,GL_BOTH,GL_CLOCK,GL_PEDAL};
static int bank,values[20];
static struct {int sound;} proj;
static int engine_bass_sound_bank(const int *s,int b){return bank;}
static int matrix_value(pref_t r){return values[r.c];}
static const x0x_param_t *pref_desc(pref_t r){
 static const x0x_param_t pot={127},effect={11};
 return bank==0&&r.c==17?&effect:&pot;
}
static int engine_bass_voice_view(int b,float *v,float *m,unsigned *s,unsigned *h){return 0;}
static int engine_bass_filter_view(int b,float *e,float *d){return 0;}
static int engine_bass_motion_view(int b,float *p,float *m,float *c,float*t,int *on){return 0;}
static const ui_original_control_view *original_text_view(pref_t r,int value){
 static ui_original_control_view v;v.shape[2]=(int)(values[11]*3.f/127.f+.5f);return &v;
}
static void s1_rate_glyph(pref_t r,int a,int b,int c,int d,int e){assert(0);}
static void juno_strip_glyph(pref_t r,float a,int b,int c,int d){assert(0);}
static int blend(int a,int b,int factor){return b;}
static void cv_line(int x,int y,int a,int b,int col){printf("L,%d,%d,%d,%d,%d ",x,y,a,b,col==C_LINE);}
static void cv_rect(int x,int y,int w,int h,int col){printf("R,%d,%d,%d,%d,%d ",x,y,w,h,col==C_LINE);}
static void dot(int x,int y,int r,int col){if(col!=C_LINE)printf("C,%d,%d,%d,0,0 ",x,y,r);}
static int og_states(pref_t r,int raw,int *index){const int n=r.c==11?2:3;*index=(int)(raw*(n-1)/127.f+.5f);return n;}
'''
main += matrix + waves + common + strip + r'''
int original_miami_mg_shape(unsigned s,float t,float *b,float *u);
int main(void){
 static const int slots[2][13]={{1,2,3,4,5,6,11,12,13,14,15,16,17},{1,2,3,4,5,7,8,9,10,12,13,14,15}};
 for(bank=0;bank<2;bank++)for(int i=0;i<13;i++){
  int c=slots[bank][i];pref_t r=PR(R_ENG,T_303,0,c);
  for(int contextual=0;contextual<3;contextual++){
   static const int inputs[3][6]={{32,95,127,127,83,0},{64,0,0,42,48,0},{95,64,127,84,127,0}};
   for(int j=0;j<20;j++)values[j]=0;
   values[2]=inputs[contextual][0]; values[3]=inputs[contextual][1];
   values[13]=inputs[contextual][2]; values[11]=inputs[contextual][3]; values[12]=inputs[contextual][4];
   for(int raw=0;raw<=pref_desc(r)->max;raw++){
    printf("%d %d %d %d ",bank,c,contextual,raw);
    if(bank==0&&(c==13||c==14||c==16)){
     int mode=(int)(raw*2.f/127.f+.5f);
     matrix_glyph(c==14?7:8,3,c==13?GL_POWER:c==16?GL_CLOCK:mode==0?GL_DOWN:mode==1?GL_UP:GL_BOTH,INK,C_LINE);
    } else orig_strip_glyph(r,raw,0,0,INK);
    puts("");
   }
  }
 }
}
'''
# The shape engine is compiled from its actual generator; legacy arpeggiator
# detents use the 128-position widths already verified by the Chicago WASM oracle.
main = main.replace('static const ui_original_control_view *original_text_view', 'int original_miami_mg_shape(unsigned,float,float*,float*);\nstatic const ui_original_control_view *original_text_view')
FORMAT_C = '#include <assert.h>\n#include <stdio.h>\n#include "original_sound.h"\n#include "miami_program.h"\nint main(void){\n original_miami_program bank;\n for(int p=3;p<=13;p++)if(p==3||p==7||p==13)for(int i=0;i<=127;i++){\n  float normalized,native;\n  assert(original_miami_program_init(&bank,0));\n  assert(original_sound_control_value(ORIGINAL_SOUND_MIAMI,p,i,&normalized));\n  assert(original_miami_program_set(&bank,p,normalized));\n  if(p==13){printf("%d %d %d\\n",p,i,(int)(bank.macro[13]*7.f+.5f));continue;}\n  assert(original_miami_program_native(&bank,p==3?2:80,&native));\n  printf("%d %d %d\\n",p,i,p==3?(int)(native*48.f+.5f)-24:(int)(native*2000.f+.5f)-1000);\n }\n}\n'
with tempfile.TemporaryDirectory(prefix='source-glyph-') as tmp:
    file = Path(tmp)/'oracle.c'
    executable = Path(tmp)/'oracle'
    file.write_text(main)
    src = fw/'experiments/original_synth'
    subprocess.run(['cc','-std=c11','-O2','-ffp-contract=off','-ffunction-sections','-fdata-sections',
                    '-I'+str(fw/'firmware/src/dsp'),'-I'+str(src),str(file),str(src/'miami_ms20.c'),
                    str(src/'fused_reference.c'),'-Wl,--gc-sections','-lm','-o',str(executable)],check=True)
    data = subprocess.check_output([executable])
    file.write_text(FORMAT_C)
    app = fw/'firmware/src/app'
    subprocess.run(['cc','-std=c11','-O2','-ffp-contract=off','-ffunction-sections','-fdata-sections',
                    '-I'+str(fw),'-I'+str(app),'-I'+str(fw/'firmware/src/dsp'),'-I'+str(src),
                    str(file),str(app/'original_sound.c'),str(src/'miami_program.c'),
                    str(src/'fused_reference.c'),'-Wl,--gc-sections','-lm','-o',str(executable)],check=True)
    formats = [list(map(int,line.split())) for line in subprocess.check_output([executable],text=True).splitlines()]
a.output.write_text(json.dumps({
    'firmware':revision, 'uiSha256':hashlib.sha256(ui.encode()).hexdigest(),
    'nativeRows':len(data.splitlines()),'nativeSha256':hashlib.sha256(data).hexdigest(),
    'encoding':'zlib base64 native drawing calls', 'formats':formats, 'values':base64.b64encode(zlib.compress(data,9)).decode('ascii'),
},indent=2)+'\n')

if a.module:
    frames,lookup,cache=[],{},{}
    src=json.loads(a.output.read_text())
    for row in zlib.decompress(base64.b64decode(src['values'])).decode().splitlines():
     fields=row.split()
     bank,parameter,context,raw=map(int,fields[:4])
     if context or (bank,parameter) in {(0,3),(0,4),(1,12),(1,13)}:continue
     arr=[]
     for cmd in fields[4:]:
      op,*args=cmd.split(',')
      x,y,w,h,dim=map(int,args)
      arr.extend(['LRC'.index(op)+3*dim,x+2,y+2,w+2,h+2])
     frame=bytes(arr)
     if frame not in cache:
      cache[frame]=len(frames)
      frames.append(base64.b64encode(frame).decode())
     index=cache[frame]
     interval=lookup.setdefault(f'{bank}:{parameter}',[])
     if not interval or index!=interval[-1]:interval.extend([raw,index])
    text=a.module.read_text().split('// BEGIN generated independent f178 native drawing calls',1)[0]
    a.module.write_text(text+'// BEGIN generated independent f178 native drawing calls\nconst frames=[\n'+
     ''.join(f' {json.dumps(x)},\n' for x in frames)+'];\nconst table='+json.dumps(lookup,separators=(',',':'))+';\n')
