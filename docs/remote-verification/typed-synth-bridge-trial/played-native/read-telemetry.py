"""Read only the named diagnostic counters from a matching emulator RAM dump."""
import argparse,struct,json,subprocess
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('elf',type=Path)
p.add_argument('output',type=Path)
a=p.parse_args()
symbols={}
for line in subprocess.check_output(['readelf','-sW',a.elf],text=True).splitlines():
    f=line.split()
    if len(f)==8 and f[0][:-1].isdigit():
        symbols[f[-1]]=int(f[1],16)
b=(a.output/'ram.bin').read_bytes()
c=struct.unpack_from('<13I',b,symbols['x0x_dbg']-0x01c00000)
assert c[0]==0x44424731 and c[1]>0
x=struct.unpack_from('<I',b,symbols['audio_xruns']-0x01c00000)[0]
pcm=(a.output/'audio.s16le').read_bytes()
peak=max(abs(word[0]) for word in struct.iter_unpack('<h',pcm))
print(json.dumps(dict(halves=c[1],worst_us=c[2],raw_late=c[5],xruns=x,pcm_peak=peak,frames=len(pcm)//4)))
