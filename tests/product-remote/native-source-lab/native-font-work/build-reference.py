from pathlib import Path
import hashlib,json,tempfile,subprocess
root=Path(__file__).resolve().parent
pins=json.loads((root/'pins.json').read_text())
captured={p:(root/p).read_bytes() for p in pins}
for p,b in captured.items(): assert hashlib.sha256(b).hexdigest()==pins[p]
s=captured['gfx.c'].decode()
def function(name):
 start=s.rfind('\n',0,s.index(name+'('))+1
 opening=s.index('{',start);depth=1;end=opening+1
 while depth:
  depth+=(s[end]=='{')-(s[end]=='}');end+=1
 return s[start:end]
code='#include <stdint.h>\n#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n'
code+=s[s.index('typedef struct'):s.index('/* Null bw')]
code+='\nstatic uint16_t cv_px[480*480]; static uint32_t cv_w,cv_h; static int32_t cv_oy,cv_y0,cv_y1;\n'
for f in ['font_bitmap_width','swap16','cv_div15','glyph','cv_text_clip','text_w']:code+=function(f)+'\n'
code+='''int main(int argc,char **argv){
 if(argc!=13)return 2;
 const felucca_font_t *fonts[]={&FONT_T,&FONT_XS,&FONT_S,&FONT_B,&FONT_M,&FONT_L};
 int role=atoi(argv[1]);cv_w=atoi(argv[2]);cv_h=atoi(argv[3]);
 int x=atoi(argv[4]),y=atoi(argv[5]),c=atoi(argv[6]),bg=atoi(argv[7]);
 cv_y0=atoi(argv[10]);cv_y1=atoi(argv[11]);cv_oy=0;
 if(role<0||role>5||cv_w>480||cv_h>480)return 3;
 for(unsigned i=0;i<cv_w*cv_h;i++)cv_px[i]=swap16(bg);
 int end=cv_text_clip(x,y,fonts[role],argv[12],c,atoi(argv[8]),atoi(argv[9]));
 printf("%d %d\\n",end,text_w(fonts[role],argv[12]));
 for(unsigned i=0;i<cv_w*cv_h;i++)printf("%04x",swap16(cv_px[i]));
 return 0;}
'''
with tempfile.TemporaryDirectory(prefix='dnbox-font-c-') as td:
 t=Path(td);(t/'reference.c').write_text(code)
 for p,b in captured.items():(t/p).write_bytes(b)
 subprocess.run(['cc','-std=c11','-O2',str(t/'reference.c'),'-o',str(t/'reference')],check=True,timeout=30)
 for p,b in captured.items():assert (t/p).read_bytes()==b
 (root/'reference').write_bytes((t/'reference').read_bytes());(root/'reference').chmod(0o755)
(root/'reference-pins.json').write_text(json.dumps({'binary':hashlib.sha256((root/'reference').read_bytes()).hexdigest(),'inputs':pins},indent=2)+'\n')
