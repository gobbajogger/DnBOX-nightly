# SPDX-License-Identifier: GPL-3.0-only
"""System Lua codec against pinned C DNR2 host. NOT a TouchOSC/runtime/device test."""
import ctypes, ctypes.util, hashlib, json, subprocess, tempfile, runpy
from xml.dom import minidom
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
        session_path=ROOT/'web/product-site/remote/touchosc/dnr2-session.lua'
        prefix='local S=dofile('+json.dumps(str(session_path))+');local s=S.new(codec,{testOnly=true,client=92,catalogCrc=305419896,catalogCount=3,controls={{id=1,kind=1,min=0,max=1000}}});\n'
        def session_exchange(expression):
            global prefix
            packet=run(prefix+'local b='+expression+';local text="";for _,v in ipairs(b) do text=text..string.format("%02x",v) end;return text')
            process.stdin.write(packet+'\n');process.stdin.flush();reply=json.loads(process.stdout.readline())['hex']
            table='{'+','.join(str(b) for b in bytes.fromhex(reply))+'}'
            prefix+=expression+';s:accept('+table+');\n'
            assert run(prefix+'return "PASS"')=='PASS'
            return reply
        hello_reply=session_exchange('s:hello()');session_exchange('s:open()');read_reply=session_exchange('s:read(1)');before_scalar_set=prefix;scalar_set_reply=session_exchange('s:set(1,900)')
        assert run(prefix+'assert(s.values[1]==900);assert(not pcall(function() s:set(1,1001) end));assert(not pcall(function() s:set(99,1) end));return "PASS"')=='PASS'
        ready_prefix=prefix
        scalar_set_table='{'+','.join(str(b) for b in bytes.fromhex(scalar_set_reply))+'}'
        assert run(before_scalar_set+'s:set(1,900);local b='+scalar_set_table+';b[7]=1;local r=s:accept(b);assert(r.status==1 and s.values[1]==900);return "PASS"')=='PASS'
        assert run(before_scalar_set+'s:set(1,900);local b='+scalar_set_table+';b[7]=1;b[25]=b[25]+1;assert(not pcall(function()s:accept(b)end));assert(s.phase=="failed");return "PASS"')=='PASS'
        session_exchange('s:close()')
        assert run(prefix+'assert(s.phase=="closed");assert(not pcall(function() s:set(1,1) end));return "PASS"')=='PASS'
        assert run(ready_prefix+'s:read(1);assert(not pcall(function() s:read(1) end));assert(not pcall(function() s:timeout() end));assert(s.phase=="failed");assert(not pcall(function() s:set(1,1) end));return "PASS"')=='PASS'
        read_table='{'+','.join(str(b) for b in bytes.fromhex(read_reply))+'}'
        assert run(ready_prefix+'s:read(1);local b='+read_table+';b[21]=5;b[25]=3;s:accept(b);assert(s.phase=="ready");return "PASS"')=='PASS'
        for mutation in ['b[7]=1','b[25]=0','b[21]=6','b[9]=43','b[50]=2','b[7]=5','b[29]=99','b[8]=2','b[1]=0']:
            assert run(ready_prefix+'s:read(1);local b='+read_table+';b[21]=5;b[25]=3;'+mutation+';assert(not pcall(function() s:accept(b) end));assert(s.phase=="failed");assert(not pcall(function() s:set(1,1) end));return "PASS"')=='PASS'
        assert run('local S=dofile('+json.dumps(str(session_path))+');assert(not pcall(S.new,codec,{testOnly=false}));return "PASS"')=='PASS'
        # Construct correlated source-codec replies for a two-control cache invariant.
        # These manipulated bytes are unit fixtures, not a second actual C descriptor.
        two=ready_prefix.replace('controls={{id=1,kind=1,min=0,max=1000}}','controls={{id=1,kind=1,min=0,max=1000},{id=2,kind=1,min=0,max=1000}}')
        assert run(two+'s:read(2);local b='+read_table+';b[21]=5;b[25]=s.revision;b[29]=2;s:accept(b);assert(s.values[1]~=nil and s.values[2]~=nil);s:read(1);b[21]=6;b[25]=s.revision+1;b[29]=1;s:accept(b);assert(s.values[1]~=nil and s.values[2]==nil);assert(not pcall(function()s:set(2,1)end));return "PASS"')=='PASS'
        controller_path=ROOT/'web/product-site/remote/touchosc/dnr2-controller.lua'
        setup='local out={};local phase;local now=0;function getMillis() return now end;function DNBOX_ON_STATE(p) phase=p end;function sendMIDI(b,r) assert(r[1]==true);for i=2,#r do assert(r[i]==false) end;out[#out+1]=b end;DNBOX_CODEC=codec;DNBOX_SESSION=dofile('+json.dumps(str(session_path))+');'
        pin='DNBOX_SIMULATOR_PIN={testOnly=true,client=93,catalogCrc=305419896,catalogCount=3,controls={{id=1,kind=1,min=0,max=1000}}};'
        load_controller='dofile('+json.dumps(str(controller_path))+');init();'
        assert run(setup+load_controller+'onReceiveNotify("dnr2",{action="connect"});assert(#out==0);return "PASS"')=='PASS'
        controller_prefix=setup+pin+load_controller+'onReceiveNotify("dnr2",{action="connect"});'
        def controller_exchange():
            global controller_prefix
            packet=run(controller_prefix+'local text="";for _,v in ipairs(out[#out]) do text=text..string.format("%02x",v) end;return text')
            process.stdin.write(packet+'\n');process.stdin.flush();reply=json.loads(process.stdout.readline())['hex']
            table='{'+','.join(str(b) for b in bytes.fromhex(reply))+'}'
            controller_prefix+='onReceiveMIDI('+table+',{true,false,false,false,false,false,false,false,false,false});'
            return table
        controller_exchange();controller_exchange();last_reply=controller_exchange()
        assert run(controller_prefix+'assert(phase=="ready" and #out==3);return "PASS"')=='PASS'
        controller_prefix+='onReceiveNotify("dnr2",{action="set",id=1,value=950});'
        set_reply=controller_exchange()
        assert run(controller_prefix+'assert(phase=="ready" and #out==4);return "PASS"')=='PASS'
        ready_controller=controller_prefix
        controller_prefix+='onReceiveNotify("dnr2",{action="close"});';controller_exchange()
        assert run(controller_prefix+'assert(phase=="disconnected" and #out==5);onReceiveNotify("dnr2",{action="set",id=1,value=1});assert(#out==5);return "PASS"')=='PASS'
        assert run(ready_controller+'onReceiveNotify("dnr2",{action="read",id=1});onReceiveNotify("dnr2",{action="set",id=1,value=1});assert(#out==5);onReceiveMIDI({144,60,100},{true});onReceiveMIDI('+last_reply+',{false,true});assert(phase=="pending");now=1001;update();assert(phase=="failed");onReceiveNotify("dnr2",{action="set",id=1,value=1});assert(#out==5);return "PASS"')=='PASS'
        assert run(ready_controller+'onReceiveNotify("dnr2",{action="read",id=1});now=-1;update();assert(phase=="failed");return "PASS"')=='PASS'
        assert run(ready_controller+'onReceiveNotify("dnr2",{action="read",id=1});onReceiveNotify("dnr2",{action="cancel"});assert(phase=="disconnected" and #out==5);onReceiveMIDI('+last_reply+',{true});assert(#out==5);return "PASS"')=='PASS'
        for when,expected in [(999,'ready'),(1000,'failed'),(1001,'failed'),(-1,'failed')]:
            assert run(ready_controller+'onReceiveNotify("dnr2",{action="read",id=1});local b='+set_reply+';b[6]=66;b[21]=5;now='+str(when)+';onReceiveMIDI(b,{true});assert(phase=="'+expected+'","deadline '+str(when)+' expected '+expected+' got "..tostring(phase));assert(#out==5);return "PASS"')=='PASS'
        pack=runpy.run_path(str(ROOT/'tests/product-remote/build-touchosc-harness.py'))
        xml=pack['make_xml']();assert xml==pack['make_xml']()
        assert xml==(ROOT/'tests/product-remote/fixtures/touchosc/source-harness.xml').read_bytes()
        document=minidom.parseString(xml);nodes=document.getElementsByTagName('node');ids=[n.getAttribute('ID') for n in nodes];assert len(ids)==len(set(ids))
        buttons=[n for n in nodes if n.getAttribute('type')=='BUTTON'];assert len(buttons)==5
        for n in nodes:
            frames=[p for p in n.getElementsByTagName('properties')[0].childNodes if p.nodeType==p.ELEMENT_NODE and p.getElementsByTagName('key')[0].firstChild.data=='frame']
            if n is nodes[0]:continue
            frame=frames[0].getElementsByTagName('value')[0];vals={k:float(frame.getElementsByTagName(k)[0].firstChild.data) for k in 'xywh'}
            assert vals['x']>=0 and vals['y']>=0 and vals['x']+vals['w']<=480 and vals['y']+vals['h']<=240
        no_io='root={findByName=function() return {values={}} end};function sendMIDI() error("Unexpected default send") end;function getMillis() return 0 end;'
        assert run(no_io+pack['root_script']()+'init();onReceiveNotify("dnr2",{action="connect"});return "PASS"')=='PASS'
        connect_button=next(n for n in buttons if any(p.nodeType==p.ELEMENT_NODE and p.getElementsByTagName('key')[0].firstChild.data=='name' and p.getElementsByTagName('value')[0].firstChild.data=='connect' for p in n.getElementsByTagName('properties')[0].childNodes))
        button_script=next(p.getElementsByTagName('value')[0].firstChild.data for p in connect_button.getElementsByTagName('properties')[0].childNodes if p.nodeType==p.ELEMENT_NODE and p.getElementsByTagName('key')[0].firstChild.data=='script')
        runtime_stub='local out={};root={findByName=function()return {values={}}end,notify=function(_,key,value)onReceiveNotify(key,value)end};function sendMIDI(b,r)out[#out+1]=b;assert(r[1]==true)end;function getMillis()return 0 end;'
        assert run(runtime_stub+pack['root_script']()+button_script+'\ninit();self={values={x=1}};onValueChanged("x");assert(#out==0);return "PASS"')=='PASS'
        assert run(runtime_stub+pack['root_script'](True)+button_script+'\ninit();self={values={x=0}};onValueChanged("x");assert(#out==0);self.values.x=1;onValueChanged("text");assert(#out==0);onValueChanged("x");assert(#out==1 and out[1][6]==0);self.values.x=0;onValueChanged("x");assert(#out==1);return "PASS"')=='PASS'
        assert b'DNBOX_SIMULATOR_PIN=nil' in xml and b'DNBOX_SIMULATOR_PIN={testOnly=true' in pack['make_xml'](True)
        print('PASS deterministic source XML, five bounded controls, exact embedded Lua and default no-send; TouchOSC application open NOT_RUN')
        print('PASS TouchOSC root-callback source -> C host; explicit simulator connect, route1 only, no-pin no-send, pending/timeout failclosed; NOT actual TouchOSC runtime')
        print('PASS simulator-only Lua session -> C host identity/catalog/lease/read/set/close; limits, pending transaction and timeout fail closed')
        print('PASS Lua codec -> pinned C host HELLO/OPEN/READ/SET/CONFLICT/CLOSE; no TouchOSC or device claim')
    finally:process.terminate();process.wait()
