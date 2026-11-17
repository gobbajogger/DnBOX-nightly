from pathlib import Path
import hashlib,subprocess,tempfile,shutil,json
r=Path(__file__).resolve().parent
source=(r/'source-x0x_host.c').read_bytes();assert hashlib.sha256(source).hexdigest()=='54f5447ada14ac7dac8164fa596dbfd73a8baadd02f52983978d3b4b12a9e8a2'
lines=[line.strip() for line in source.decode().splitlines() if 'raw[n++] = (uint8_t)' in line];assert len(lines)==3
body='#include <stdint.h>\n#include <stdio.h>\nint main(void){uint8_t raw[3];for(unsigned value=0;value<65536;value++){uint16_t p=value;int n=0;'+''.join(lines)+'fwrite(raw,1,3,stdout);}return 0;}\n'
captured=body.encode()
with tempfile.TemporaryDirectory(prefix='dnbox-color-')as td:
 t=Path(td);c=t/'reference.c';c.write_bytes(captured);assert c.read_bytes()==captured
 subprocess.run(['cc','-O2',str(c),'-o',str(t/'reference')],check=True,timeout=30);assert c.read_bytes()==captured
 shutil.copyfile(t/'reference',r/'reference');(r/'reference').chmod(0o755)
(r/'reference-pins.json').write_text(json.dumps({'binary':hashlib.sha256((r/'reference').read_bytes()).hexdigest(),'source':hashlib.sha256(source).hexdigest(),'stagedC':hashlib.sha256(captured).hexdigest()})+'\n')
