#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Run the authenticated Build9 ARM64 LFO formatter directly (requires Unicorn).

Usage: python3 tools/probe-superj6-original-lfo.py PRIVATE_AU_ZIP RECEIPT_JSON
The private installer/executable remains outside Git; this script embeds neither.
Only hashes, literal output strings, numerical outputs and code addresses are saved.
"""
import zipfile,struct,json,hashlib,sys,plistlib
import unicorn
from pathlib import Path
from unicorn import Uc,UC_ARCH_ARM64,UC_MODE_ARM
from unicorn.arm64_const import UC_ARM64_REG_X0,UC_ARM64_REG_X1,UC_ARM64_REG_LR,UC_ARM64_REG_SP,UC_ARM64_REG_D0,UC_ARM64_REG_S0,UC_ARM64_REG_PC,UC_ARM64_REG_S8,UC_ARM64_REG_X20
p=Path(sys.argv[1])
assert hashlib.sha256(p.read_bytes()).hexdigest()=='abe2f2e089306770489fb30c8870f608dc2f2e0804541f624337523679638a28'
with zipfile.ZipFile(p) as z:
 b=z.read('SuperJ6 AU.appex/SuperJ6 AU')
 info=plistlib.loads(z.read('SuperJ6 AU.appex/Info.plist'))
assert info['CFBundleShortVersionString']=='0.999.8' and str(info['CFBundleVersion'])=='9'
assert hashlib.sha256(b).hexdigest()=='a5243e50bda6bd44f463c6e63ea3137802142f55f3c1ea25a5a6e046acba81a1'
u=Uc(UC_ARCH_ARM64,UC_MODE_ARM);base=0x100000000;stop=0x200000000;u.mem_map(base,0x800000);u.mem_write(base,b[:0x7f4000]);u.mem_map(stop,0x10000)
def call(fn,index=None,raw=None,end=stop,string=True):
 u.reg_write(UC_ARM64_REG_SP,stop+0x8000);u.reg_write(UC_ARM64_REG_LR,stop)
 if index is not None:u.reg_write(UC_ARM64_REG_X0,index)
 if raw is not None:u.reg_write(UC_ARM64_REG_S0,raw)
 u.emu_start(fn,end,count=1000);assert u.reg_read(UC_ARM64_REG_PC)==end
 if not string:return None
 a=u.reg_read(UC_ARM64_REG_X0);c=u.reg_read(UC_ARM64_REG_X1);return struct.pack('<QQ',a,c)[:(c>>56)&15].decode()
labels=[call(0x100283aa8,i) for i in range(18)]
factors=[]
for i in range(18):
 call(0x100283c34,i,string=False);factors.append(struct.unpack('<d',struct.pack('<Q',u.reg_read(UC_ARM64_REG_D0)))[0])
def native(raw):return call(0x100021054,1,raw,0x1000210d4)
starts=[0]
for target in range(16,-1,-1):
 lo,hi=0,0x3f800000
 while lo<hi:
  mid=(lo+hi)//2
  if labels.index(native(mid))<=target:hi=mid
  else:lo=mid+1
 starts.append(lo)
samples={struct.unpack('<I',struct.pack('<f',i/127))[0] for i in range(128)}
for x in starts[1:]:samples.update([x-1,x,x+1])
samples.update([0,0x3f000000,0x3f800000])
fields=[]
for f in [88,96,100]:
 target=0x10001f570+struct.unpack_from('<H',b,0x60526e+f*2)[0]*4
 assert target==0x10001f628
 w=struct.unpack_from('<I',b,0x1f630)[0];imm=w&0x3ffffff;imm=imm-(1<<26) if imm&(1<<25) else imm
 assert w>>26==0x25 and 0x10001f630+imm*4==0x100021054
 fields.append({'field':f,'genericFormatterArm64':'0x10001f520','jumpArm64':hex(target),'invert':True,'selectionArm64':'0x100021054','literalArm64':'0x100283aa8'})
# Execute each original generic UI dispatch-table slice, carrying its saved
# normalized binary32 value in s8, until the original literal formatter returns.
# Stop before the subsequent Swift append/UI bridge; no Apple API is mocked.
for f in fields:
 for raw in sorted(samples):
  u.reg_write(UC_ARM64_REG_X20,f['field']);u.reg_write(UC_ARM64_REG_S8,raw)
  actual=call(0x10001f554,end=0x1000210d4)
  assert actual==native(raw)
 f['executedSamples']=len(samples)
r={'nativeFieldSamples':len(fields)*len(samples),'version':info['CFBundleShortVersionString'],'build':str(info['CFBundleVersion']),'unicornVersion':unicorn.__version__,'archiveSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'binarySha256':hashlib.sha256(b).hexdigest(),'binaryBytes':len(b),'execution':'Authenticated original ARM64 instructions under Unicorn; no reconstructed formatter','formatterCodeSha256':hashlib.sha256(b[0x283aa8:0x283c20]).hexdigest(),'selectionCodeSha256':hashlib.sha256(b[0x21054:0x2110c]).hexdigest(),'fields':fields,'labels':labels,'frequencyFactors':factors,'transitionStarts':[hex(x) for x in starts],'samples':[{'word':hex(x),'value':struct.unpack('<f',struct.pack('<I',x))[0],'label':native(x)} for x in sorted(samples)]}
Path(sys.argv[2]).write_text(json.dumps(r,indent=2)+'\n');print('PASS original ARM64',len(labels),'literal labels,',len(samples),'normalized samples; all3rate field jump targets verified')
