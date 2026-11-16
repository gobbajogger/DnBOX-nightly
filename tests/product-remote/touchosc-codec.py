# SPDX-License-Identifier: GPL-3.0-only
"""System Lua codec against pinned C DNR2 host. NOT a TouchOSC/runtime/device test."""
import ctypes, ctypes.util, hashlib, json, subprocess, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
CODEC=ROOT/'web/product-site/remote/touchosc/dnr2-codec.lua'
REF=ROOT/'tests/product-remote/tests'
for file, digest in [('remote_core.c','4f7fae3087e3477d8bf8a65f77c3189dddddd3e1d34b8c264b3b1017578f97d4'),('remote_wire.c','81b4a8729cab7af75bb8495f528d9979d0fc02abbedfba05aaac3f0dae659390')]:
    assert hashlib.sha256((REF/'c-reference'/file).read_bytes()).hexdigest()==digest
name=ctypes.util.find_library('lua5.4')
if not name: raise SystemExit('NOT_RUN: system Lua5.4 library unavailable')
lua=ctypes.CDLL(name)
lua.luaL_newstate.restype=ctypes.c_void_p
lua.luaL_openlibs.argtypes=[ctypes.c_void_p]
lua.luaL_loadstring.argtypes=[ctypes.c_void_p,ctypes.c_char_p]
lua.lua_pcallk.argtypes=[ctypes.c_void_p,ctypes.c_int,ctypes.c_int,ctypes.c_int,ctypes.c_longlong,ctypes.c_void_p]
lua.lua_tolstring.argtypes=[ctypes.c_void_p,ctypes.c_int,ctypes.c_void_p];lua.lua_tolstring.restype=ctypes.c_char_p
lua.lua_close.argtypes=[ctypes.c_void_p]
def run(source):
    state=lua.luaL_newstate();lua.luaL_openlibs(state)
    try:
        script=('local codec=dofile('+json.dumps(str(CODEC))+')\n'+source).encode()
        if lua.luaL_loadstring(state,script) or lua.lua_pcallk(state,0,1,0,0,None):raise AssertionError(lua.lua_tolstring(state,-1,None).decode())
        return lua.lua_tolstring(state,-1,None).decode()
    finally:lua.lua_close(state)
def encode(c):
    fields=','.join(k+'='+('{'+','.join(map(str,v))+'}' if isinstance(v,list) else str(v)) for k,v in c.items())
    return run('local b=codec.encodeCommand({'+fields+'});local s="";for _,v in ipairs(b) do s=s..string.format("%02x",v) end;return s')
def decode(raw):
    table='{'+','.join(str(b) for b in bytes.fromhex(raw))+'}'
    keys=['op','status','kind','unit','client','epoch','request','revision','control','value']
    values=run('local r=codec.decodeReply('+table+');return table.concat({'+','.join('r.'+k for k in keys)+',r.unitHigh[1],r.unitHigh[2],r.unitHigh[3]},",")')
    nums=[int(float(v)) for v in values.split(',')]
    return dict(zip(keys,nums[:10]),unitHigh=nums[10:])
with tempfile.TemporaryDirectory(prefix='dnbox-touchosc-') as tmp:
    binary=Path(tmp)/'host'
    subprocess.run(['cc','-std=c11','-Wall','-Wextra','-Werror','-O2','c_fixture.c','c-reference/remote_core.c','c-reference/remote_wire.c','-o',str(binary)],cwd=REF,check=True)
    process=subprocess.Popen([binary],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
    try:
        c=dict(version=2,op=0,unit=0,unitHigh=[0,0,0],client=91,epoch=0,request=1,revision=0,control=0,token=0,value=0)
        def exchange():
            process.stdin.write(encode(c)+'\n');process.stdin.flush()
            response=json.loads(process.stdout.readline());assert 'hex' in response
            return decode(response['hex'])
        hello=exchange();assert hello['status']==0 and hello['unit']==42 and hello['unitHigh']==[4294967295,2147483648,305419896]
        c.update(op=1,unit=hello['unit'],unitHigh=hello['unitHigh'],request=2)
        opened=exchange();assert opened['status']==0
        c.update(op=2,epoch=opened['epoch'],request=3,control=1,revision=opened['revision'])
        read=exchange();assert read['status']==0 and read['value']==500 and read['kind']==1
        c.update(op=3,request=4,value=800,revision=read['revision'])
        written=exchange();assert written['status']==0 and written['value']==800
        c.update(request=5,value=700) # deliberately stale revision
        conflict=exchange();assert conflict['status']==5
        c.update(op=7,request=6,control=0,value=0,revision=written['revision'])
        closed=exchange();assert closed['status']==0
        assert run('local ok=pcall(codec.encodeCommand,{version=2,op=8});assert(not ok);return "PASS"')=='PASS'
        assert run('local ok=pcall(codec.decodeReply,{});assert(not ok);return "PASS"')=='PASS'
        assert run("local base={version=2,op=0,unit=268435455,unitHigh={4294967295,2147483648,305419896},client=268435455,epoch=268435455,request=268435455,revision=268435455,control=16383,token=16383,value=4294967295};local b=codec.encodeCommand(base);assert(#b==51 and b[35]==15 and b[40]==15);for _,bad in ipairs({-1,1.5,4294967296,math.huge}) do base.value=bad;assert(not pcall(codec.encodeCommand,base)) end;return 'PASS'")=='PASS'
        print('PASS Lua codec -> pinned C host HELLO/OPEN/READ/SET/CONFLICT/CLOSE; no TouchOSC or device claim')
    finally:process.terminate();process.wait()
