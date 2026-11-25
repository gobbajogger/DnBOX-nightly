"""Read only final project patch/ARP ownership from a matching target emulator dump."""
from pathlib import Path
import subprocess,struct,json,sys
elf,ram=map(Path,sys.argv[1:])
symbols={}
for row in subprocess.check_output(['readelf','-sW',elf],text=True).splitlines():
    v=row.split()
    if len(v)==8 and v[0][:-1].isdigit():
        symbols[v[7]]=int(v[1],16)
r=ram.read_bytes()
base=0x1c00000
sound=struct.unpack_from('<I',r,symbols['mot_base_snd']-base)[0]
assert base <= sound < base+len(r)-896
cell=sound-base+2*12*32
bank_id=r[cell+29]
arp=r[cell+2*32:cell+3*32]
assert arp[0:2]==b'A\x01'
rec=dict(finalPartABank=bank_id,finalArpOn=bool(arp[2]&1),arpOctaves=((arp[2]>>3)&3)+1)
print(json.dumps(rec))
