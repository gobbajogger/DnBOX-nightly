#!/usr/bin/env python3
"""Compile the exact pinned f178 named-selector fallback and capture BREAK's four positions."""
import argparse,hashlib,json,re,subprocess,tempfile
from pathlib import Path
SOURCE='f1786ebec2616477163b62b029c7e77405a9c3de'
UI_SHA256='8f9b86dcbe801297cd0a60427c0e942f0536b03a9c7a3f40c99bf9b51cc24629'
def main():
 p=argparse.ArgumentParser();p.add_argument('firmware',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
 data=(a.firmware/'firmware/src/app/ui.c').read_bytes();assert hashlib.sha256(data).hexdigest()==UI_SHA256,'Pinned ui.c differs'
 source=data.decode();definitions=re.search(r'static const char \*const BRKSLICE_N\[\].*?static const x0x_param_t BRKSLICE_P\[2\] = \{.*?\n\};',source,re.S).group()
 branch=re.search(r'int n = d->max \+ 1, k, pw = n > 6 \? 3 : 6, gap = 2, w0 = n \* \(pw \+ gap\) - gap;.*?box\(cx - w0 / 2 \+ k \* \(pw \+ gap\), 33, pw, 9, k == val \? col : C_LINE\);',source,re.S).group()
 radius=re.search(r'static int32_t rad_of\(int32_t h\) \{[^\n]+\}',source).group()
 box=re.search(r'static void box\(int32_t x, int32_t y, int32_t w, int32_t h, uint16_t c\) \{[^\n]+\}',source).group()
 prefix='''#include <stdio.h>\n#include <stdint.h>\ntypedef struct {const char *name;uint8_t max,def;const char *const *names;} x0x_param_t;\n#define C_LINE 0\nstatic int first;\nstatic void rbox(int32_t x,int32_t y,int32_t w,int32_t h,int32_t radius,uint16_t ink){printf("%s[%d,%d,%d,%d,%d,%d]",first?",":"",x,y,w,h,radius,ink);first=1;}\n'''
 body=prefix+'\n'+definitions+'\n'+radius+'\n'+box+'\nint main(void){for(int bank=0;bank<2;bank++)for(int val=0;val<4;val++){const x0x_param_t*d=&BRKSLICE_P[bank];int cx=0,col=1;first=0;printf("[%d,%d,\\\"%s\\\",[",bank,val,d->names[val]);\n'+branch+'\nprintf("]]\\n");}return 0;}\n'
 # Intercept only the final drawing sink; descriptor, fallback and radius logic
 # above are exact source fragments. No selector geometry is reconstructed in C.
 with tempfile.TemporaryDirectory(prefix='dnbox-break-slices-') as tmp:
  c=Path(tmp)/'oracle.c';binary=Path(tmp)/'oracle';c.write_text(body)
  subprocess.run(['cc','-std=c99','-O2','-Wall','-Wextra','-Werror',str(c),'-o',str(binary)],check=True)
  rows=[json.loads(line) for line in subprocess.check_output([str(binary)],text=True).splitlines()]
 assert len(rows)==8
 result={'source':SOURCE,'uiSHA256':UI_SHA256,'fragments':{k:hashlib.sha256(v.encode()).hexdigest() for k,v in [('descriptors',definitions),('fallback',branch),('radius',radius),('box',box)]},'capture':'Unmodified source fragments compiled; final rbox sink records x,y,w,h,radius,ink (not raster AA).','projection':{'translateX':20,'translateY':-28,'cell':[40,24]},'rows':[{'bank':bank,'raw':raw,'label':label,'nativeBoxes':boxes} for bank,raw,label,boxes in rows]}
 a.output.write_text(json.dumps(result,indent=2)+'\n');print('PASS 8 actual named-selector cases (two banks × four raw positions)')
if __name__=='__main__':main()
