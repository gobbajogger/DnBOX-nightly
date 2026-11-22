"""Sandboxed browser staging against the exact native stdio host."""
from functools import partial
from hashlib import sha256
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import subprocess
from threading import Thread
import sys
from playwright.sync_api import expect, sync_playwright

root = Path.cwd()
stage, host_binary, out = [Path(value).resolve() for value in sys.argv[1:]]
assert sha256(host_binary.read_bytes()).hexdigest() == '5dccda64220867a87a770ba1a669b251fff140d719b35d32de42b3084cb05793'

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def do_GET(self):
        if self.path == '/staging/remote/device/catalog.mjs':
            data = stage.read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        else:
            super().do_GET()

    def translate_path(self, request):
        return super().translate_path(request.removeprefix('/staging'))

MIDI = r"""
({mode})=>{
 window.requests=0;
 const port=(id,type)=>Object.assign(new EventTarget(),{id,type,name:id,state:'connected',
  open:async()=>{},close:async()=>{}});
 const input=port('DnBOX input','input');
 const output=Object.assign(port('DnBOX output','output'),{
  async send(data){
   const reply=await window.nativeExchange(Array.from(data));
   if(reply.length)input.dispatchEvent(Object.assign(new Event('midimessage'),{data:new Uint8Array(reply)}));
  }
 });
 const otherInput=port('Other input','input');
 const otherOutput=Object.assign(port('Other output','output'),{send(){throw Error('Unexpected foreign output routing')}});
 const inputs=new Map([[input.id,input]]);
 const outputs=new Map([[output.id,output]]);
 if(mode==='ambiguous'||mode==='device'){
  inputs.set(otherInput.id,otherInput);
  outputs.clear();outputs.set(otherOutput.id,otherOutput);outputs.set(output.id,output);
 } else if(mode==='missing') outputs.clear();
 Object.defineProperty(navigator,'requestMIDIAccess',{value:async o=>{
  if(!o.sysex)throw Error('SysEx required');
  window.requests++;return{inputs,outputs};
 }});
}
"""

def run(browser, url, mode):
    page = browser.new_page(viewport={'width':390,'height':844})
    page.set_default_timeout(6000)
    errors, trace = [], []
    lease_ended = False
    page.on('pageerror', lambda error: errors.append(str(error)))
    with subprocess.Popen([str(host_binary),'--serve'],stdin=subprocess.PIPE,
                          stdout=subprocess.PIPE,text=True) as host:
        def exchange(raw):
            nonlocal lease_ended
            request=bytes(raw)
            assert len(request)==51
            if mode == 'expiry' and request[5] == 6 and not lease_ended:
                end = request[:5] + b'\x07' + request[6:]
                host.stdin.write(end.hex()+'\n'); host.stdin.flush()
                closed = bytes.fromhex(host.stdout.readline())
                assert closed[5:7] == b'\x47\x00'
                lease_ended = True
            host.stdin.write(request.hex()+'\n'); host.stdin.flush()
            response=bytes.fromhex(host.stdout.readline())
            assert len(response)==51 and response[5]==request[5]|64
            value=lambda data,start,length: sum(data[start+i]<<(7*i) for i in range(length))
            trace.append([request[5],response[6],value(response,24,4),value(response,30,5),value(request,10,4)])
            if mode=='mismatch' and request[5]==0:
                return list(response[:30]+bytes([response[30]^1])+response[31:])
            if mode=='silent' and request[5]==0:
                return []
            return list(response)
        try:
            page.expose_function('nativeExchange',exchange)
            page.add_init_script(f"({MIDI})({json.dumps({'mode':mode})})")
            route = '/remote/device/' if mode=='device' else '/remote/'
            page.goto(url+('' if mode=='shipping' else '/staging')+route,wait_until='networkidle')
            connect=page.locator('#connect')
            if mode=='device':
                page.locator('#permission').click()
                expect(connect).to_be_disabled()
                page.locator('#input').select_option('DnBOX input')
                expect(connect).to_be_disabled()
                page.locator('#output').select_option('DnBOX output')
                expect(connect).to_be_enabled()
                connect.click()
                expect(page.locator('#status')).to_have_text('Connected for read-only inspection.')
                expect(page.locator('#control-1')).to_have_value('75')
                expect(page.locator('#control-1')).to_be_disabled()
                page.locator('#refresh').click()
                expect(page.locator('#status')).to_have_text('Connected for read-only inspection.')
                page.locator('#disconnect').click()
                expect(page.locator('#status')).to_have_text('Disconnected.')
                assert [row[0] for row in trace]==[0,2,2],trace
            else:
                status=page.locator('#conn-state')
                connect.click()
                if mode=='shipping':
                    expect(status).to_contain_text('No reviewed firmware catalog')
                    assert page.evaluate('window.requests')==0 and not trace
                elif mode=='missing':
                    expect(status).to_contain_text('No MIDI input and output pair')
                    assert not trace
                elif mode=='ambiguous':
                    expect(status).to_have_text('Multiple MIDI ports. Choose a pair.')
                    assert not trace
                elif mode in ('mismatch','silent'):
                    expect(status).to_have_text('This firmware does not match the page’s reviewed controls.' if mode=='mismatch' else 'The action was not confirmed. Refresh or reconnect before trying again.')
                    assert trace and all(row[0]==0 for row in trace),trace
                elif mode=='expiry':
                    expect(status).to_have_text('Connected. 1 controls confirmed.')
                    expect(status).to_contain_text('Connection lost')
                    expect(page.locator('#apply')).to_be_disabled()
                    assert lease_ended and any(row[:2]==[6,4] for row in trace),trace
                    assert not any(row[0]==3 for row in trace),trace
                else:
                    expect(status).to_have_text('Connected. 1 controls confirmed.')
                    page.get_by_label('More actions').click()
                    page.wait_for_function('window.requests === 1')
                    while not any(row[0]==6 for row in trace):
                        page.wait_for_timeout(100)
                    control=page.locator('#fw-1')
                    expect(control).to_have_value('75')
                    control.fill('76')
                    page.locator('#apply').click()
                    expect(status).to_have_text('Stored 76. Update queued.')
                    page.locator('#firmware-undo').click()
                    expect(status).to_have_text('Restored stored value 75. Update queued.')
                    connect.click()
                    expect(status).to_have_text('Disconnected')
                    assert [row[:4] for row in trace if row[0]!=6]==[
                        [0,0,1,0xecca5979],[1,0,1,0],[2,0,1,75],[3,1,2,76],
                        [2,0,2,76],[2,0,2,76],[3,1,3,75],[2,0,3,75],[7,0,3,0],
                    ],trace
                    assert trace[0][-1] != 91
            assert not errors,errors
        finally:
            page.close();host.stdin.close();assert host.wait(timeout=5)==0
    return {'trace':trace,'pageErrors':errors}

with ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=root/'web/product-site')) as server:
    thread=Thread(target=server.serve_forever,daemon=True);thread.start()
    try:
        with sync_playwright() as pw:
            with pw.chromium.launch(chromium_sandbox=True) as browser:
                cases={mode:run(browser,f'http://127.0.0.1:{server.server_port}',mode)
                       for mode in ('shipping','missing','ambiguous','mismatch','silent','workspace','device','expiry')}
                out.write_text(json.dumps({'chromium':browser.version,'softwareStaging':True,'cases':cases},indent=2)+'\n')
                print('PASS sandboxed Chromium: shipping closed, missing/ambiguous no send, HELLO-only negatives, Workspace heartbeat/Apply/Undo/CLOSE, Device explicit pair read-only, revoked lease stale on next heartbeat')
    finally:
        server.shutdown();thread.join()
