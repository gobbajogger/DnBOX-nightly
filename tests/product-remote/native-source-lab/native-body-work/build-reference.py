from pathlib import Path
import hashlib,json,tempfile,subprocess,shutil
r=Path(__file__).resolve().parent;full=(r/'source-ui_drum_voice.inc').read_bytes();assert hashlib.sha256(full).hexdigest()=='a669c3c03c19204bd26eda0bf59b2f33f43a52da8beb718df8da24ee10b45353'
s=full.decode();b=(s[s.index('static const uint16_t DV_XY'):s.index('/* R22 layout')]+s[s.index('static UI_DRAW void dv_body_pictogram'):s.index('/* TUNE fork')]).encode()
assert b==(r/'native-body-source.inc').read_bytes()
pre=r'''#include <stdio.h>
#include <stdint.h>
#define UI_DRAW
#define T_808 1
#define T_909 0
#define NDRUM 11
#define C_WHITE 65535
static int count;
static uint16_t blend(uint16_t a,uint16_t b,int x){return a;}
static void cv_stroke_aa(float a,float b,float c,float d,float w,uint16_t ink){printf("%s[%.9g,%.9g,%.9g,%.9g,%.9g]",count++?",":"",a,b,c,d,w);}
'''
post=r'''int main(void){int kit,voice,x,y;float scale;while(scanf("%d %d %d %d %f",&kit,&voice,&x,&y,&scale)==5){count=0;printf("[");dv_body_pictogram(kit,voice,x,y,scale,0,0);puts("]");}return 0;}'''
captured={'reference.c':pre.encode()+b+post.encode()}
with tempfile.TemporaryDirectory(prefix='dnbox-body-')as td:
 t=Path(td)
 for p,b in captured.items():(t/p).write_bytes(b)
 subprocess.run(['cc','-O2','-ffp-contract=off',str(t/'reference.c'),'-o',str(t/'reference')],check=True,timeout=30)
 for p,b in captured.items():assert (t/p).read_bytes()==b
 shutil.copyfile(t/'reference',r/'reference');(r/'reference').chmod(0o755)
(r/'reference-pins.json').write_text(json.dumps({'binary':hashlib.sha256((r/'reference').read_bytes()).hexdigest()})+'\n')
