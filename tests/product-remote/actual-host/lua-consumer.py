# SPDX-License-Identifier: GPL-3.0-only
# System Lua5.4 source callbacks only; no actual TouchOSC application admission.
import ctypes,ctypes.util,json,subprocess,os
from pathlib import Path
ROOT=Path(__file__).resolve().parent
SOURCE=ROOT.parents[2]/"web/product-site/remote/touchosc"
CODEC=SOURCE/"dnr2-codec.lua"
BINARY=os.environ.get("DNBOX_ACTUAL_HOST_BINARY")
if not BINARY:raise SystemExit("NOT_RUN: DNBOX_ACTUAL_HOST_BINARY must name the exact pinned actual-host fixture")
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

import sys,select
SESSION=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else SOURCE/'dnr2-session.lua'
class HostSession:
 def __init__(self,client=94):
  self.process=subprocess.Popen([BINARY,'--serve'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
  self.prefix='local S=dofile('+json.dumps(str(SESSION))+');local s=S.new(codec,{testOnly=true,client='+str(client)+',catalogCrc=4005792705,catalogCount=326,controls={{id=245,kind=1,min=0,max=127},{id=246,kind=1,min=0,max=127}}});\n'
 def line(self,line):
  self.process.stdin.write(line+'\n');self.process.stdin.flush()
  if not select.select([self.process.stdout],[],[],15)[0]:raise TimeoutError('Actual-host Lua exchange timed out')
  result=self.process.stdout.readline()
  if not result:raise RuntimeError('Actual-host Lua subprocess exited')
  return json.loads(result)
 def packet(self,expression):return run(self.prefix+'local b='+expression+';local text="";for _,v in ipairs(b) do text=text..string.format("%02x",v) end;return text')
 def accept(self,expression,reply,assertion=None):
  table='{'+','.join(str(b) for b in bytes.fromhex(reply))+'}'
  self.prefix+=expression+';'+('s:accept('+table+');' if assertion is None else assertion.replace('REPLY',table))+'\n'
  assert run(self.prefix+'return "PASS"')=='PASS'
 def exchange(self,expression):
  packet=self.packet(expression);reply=self.line(packet)['hex'];self.accept(expression,reply);return decode(reply)
 def check(self,assertion):assert run(self.prefix+assertion+';return "PASS"')=='PASS'
 def __enter__(self):return self
 def __exit__(self,*args):self.process.kill();self.process.wait(timeout=5)
 def ready(self):self.exchange('s:hello()');self.exchange('s:open()');self.exchange('s:read(245)')
with HostSession() as h:
 h.ready();r=h.exchange('s:set(245,23)');assert r['status']==1 and r['value']==23
 h.check('assert(s.phase=="ready" and s.values[245]==23)')
 print('PASS actual-host queued scalar SET accepted as stored target')
 # QUEUED is not admitted for READ or other operations.
 expression='s:read(245)';raw=bytearray.fromhex(h.line(h.packet(expression))['hex']);raw[6]=1
 h.accept(expression,raw.hex(),'assert(not pcall(function()s:accept(REPLY)end));assert(s.phase=="failed");')
 print('PASS queued READ rejected rather than broadly accepting status1')
with HostSession(95) as h:
 h.ready();expression='s:set(245,23)';packet=h.packet(expression);first=decode(h.line(packet)['hex']);assert first['status']==1
 external=h.line('external 24');assert external['revision']>first['revision']
 reply=h.line(packet)['hex'];assert decode(reply)['revision']==external['revision']
 h.accept(expression,reply,'assert(not pcall(function()s:accept(REPLY)end));assert(s.phase=="failed");assert(not pcall(function()s:set(245,25)end));')
 print('PASS actual cached SET replay after external edit fails closed on extra revision')
with HostSession(96) as h:
 h.ready();h.exchange('s:read(246)');h.check('assert(s.values[245]~=nil and s.values[246]~=nil)')
 h.line('external 24');h.exchange('s:read(246)');h.check('assert(s.values[245]==nil and s.values[246]~=nil);assert(not pcall(function()s:set(245,25)end))')
 h.exchange('s:read(245)');h.check('assert(s.values[245]==24)');h.exchange('s:set(245,25)')
 print('PASS newer READ invalidates other cached controls until each is refreshed')
print('PASS Lua5.4 source/actual-app host cases; no TouchOSC document, MIDI/device or native admission')
with HostSession(97) as h:
 h.prefix='local out={};local phase,value;function getMillis()return 0 end;function DNBOX_ON_STATE(p,v)phase=p;value=v end;function sendMIDI(b,r)assert(r[1]);out[#out+1]=b end;DNBOX_CODEC=codec;DNBOX_SESSION=dofile('+json.dumps(str(SESSION))+');DNBOX_SIMULATOR_PIN={testOnly=true,client=97,catalogCrc=4005792705,catalogCount=326,controls={{id=245,kind=1,min=0,max=127}}};dofile('+json.dumps(str(SOURCE/'dnr2-controller.lua'))+');init();onReceiveNotify("dnr2",{action="connect"});'
 def controller_exchange():
  packet=run(h.prefix+'local text="";for _,v in ipairs(out[#out])do text=text..string.format("%02x",v)end;return text')
  reply=h.line(packet)['hex'];table='{'+','.join(str(b)for b in bytes.fromhex(reply))+'}'
  h.prefix+='onReceiveMIDI('+table+',{true,false,false,false,false,false,false,false,false,false});'
 controller_exchange();controller_exchange();controller_exchange();h.check('assert(phase=="ready" and #out==3)')
 h.prefix+='onReceiveNotify("dnr2",{action="set",id=245,value=23});';controller_exchange();h.check('assert(phase=="ready" and value.value==23 and value.queued==true and #out==4)')
 print('PASS actual-host queued target reaches controller callback with queued=true, no audio-applied claim')
