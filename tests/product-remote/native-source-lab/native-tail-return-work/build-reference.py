from pathlib import Path
import hashlib,json,tempfile,subprocess,shutil
r=Path(__file__).resolve().parent;source=(r.parent/'native-live-tail-work/source/ui.c').read_bytes();assert hashlib.sha256(source).hexdigest()=='a01c6ffecd57344d34f9b7a52ca3e95487d376b693600ad60532a1977a8741a6'
s=source.decode();body=s[s.index('static uint32_t dg_last[2]'):s.index('static UI_DRAW void drum_strip_glyph',s.index('static uint32_t dg_last[2]'))];assert '#define DG_BACK_MS 300u' in s
pre='#include <stdint.h>\n#include <stdio.h>\n#define UI_DRAW\n#define NDRUM 11\n#define T_808 1\n#define DG_BACK_MS 300u\ntypedef struct{int a,b;}pref_t;static uint32_t now;static uint32_t plat_ms(void){return now;}\n'
post='int main(void){int target,voice,live;while(scanf("%d %d %d %u",&target,&voice,&live,&now)==4){float back=dg_live_back((pref_t){target,voice},live);printf("[%.9g,[",back);for(int t=0;t<2;t++)for(int v=0;v<12;v++)printf("%s%u",t||v?",":"",dg_last[t][v]);puts("]]");}return 0;}\n'
b=(pre+body+post).encode()
with tempfile.TemporaryDirectory(prefix='dnbox-tail-return-')as td:
 t=Path(td);p=t/'reference.c';p.write_bytes(b);assert p.read_bytes()==b;subprocess.run(['cc','-O2','-ffp-contract=off',str(p),'-o',str(t/'reference')],check=True,timeout=30);assert p.read_bytes()==b;shutil.copyfile(t/'reference',r/'reference');(r/'reference').chmod(0o755)
(r/'reference-pins.json').write_text(json.dumps({'binary':hashlib.sha256((r/'reference').read_bytes()).hexdigest(),'source':hashlib.sha256(source).hexdigest(),'staged':hashlib.sha256(b).hexdigest()})+'\n')
