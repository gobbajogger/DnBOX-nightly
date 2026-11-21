#!/usr/bin/env python3
"""Build the guard renderer from the 3e67b59c oracle and the 61827a71 production source."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import shutil
import struct
import subprocess

def main(src,evidence,out,zig,cache):
    base_spec=importlib.util.spec_from_file_location('supplement',Path(__file__).with_name('build-supplement.py'))
    base=importlib.util.module_from_spec(base_spec);base_spec.loader.exec_module(base)
    d=out/'guard-build';d.mkdir(exist_ok=True)
    report=json.loads((evidence/'docs/lanes/fwui/current/native-routes/stock-guard.json').read_bytes())
    oracle=evidence/'tests/ui_inventory/stock_guard_oracle.c'
    recs=[(model,shot,report['models'][model]['shots'][shot]) for model in ['elite','pro'] for shot in ['first','safe-play']]
    # Fresh native C rerenders each full frame using target register inputs.
    ccflags=['-O1','-std=c11','-DX0X_HOST=1','-DBOARD_SMK37=1','-I'+str(out/'native'),'-I'+str(src/'firmware/src')]
    subprocess.run(['cc',*ccflags,'-I'+str(src/'tests/ui_inventory'),str(oracle),'-o',str(d/'oracle')],check=True)
    for model,shot,data in recs:
        folder=d/(model+'-'+shot);folder.mkdir(exist_ok=True)
        (folder/'crash.bin').write_bytes(struct.pack('<17I',*data['crashRecord']))
        subprocess.run([str(d/'oracle')],cwd=folder,check=True)
    for n in ('native_routes.c','native_startup.inc'):
        shutil.copy2(src/'tests/ui_inventory'/n,d/n)
    # Adapt the host's nonlocal reset boundary. The original rendering, assertions,
    # control flow and observed register values are retained.
    temp=d/'shadow';tmp=temp/'tests/ui_inventory';tmp.mkdir(parents=True,exist_ok=True)
    for n in ('native_routes.c','native_startup.inc'): shutil.copy2(d/n,tmp/n)
    base.route_wasm(temp)
    for n in ('native_routes.c','native_startup.inc'): shutil.copy2(tmp/n,d/n)
    p=d/'native_routes.c';s=p.read_text()
    s=base.replace(s,'else if (scenario == FAULT) fm1_fault(&fm1_crash);',
        'else if (key==3) safe_main();\n        else if (key==4) fm1_main();\n        else if (key==2 || scenario == FAULT) fm1_fault(&fm1_crash);')
    s=base.replace(s,'static void capture(const char *name) {w3_capture(name,pixels);}', '''
static void capture(const char *name) {
    int i=w3_family(); assert(i>=0 && i<4);
    if(i%2==0 && strcmp(name,"fault")) return; /* only this endpoint was observed in the first shot */
    static const char *const groups[]={"elite-first","elite-safe-play","pro-first","pro-safe-play"};
    char id[80]; snprintf(id,sizeof id,"guard-%s-%s",groups[i],name);
    w3_capture(id,pixels);
}
''')
    p.write_text(s)
    oracle_src=oracle.read_text()
    begin=oracle_src.index('    FILE *input'); end=oracle_src.index('    assert(fm1_crash.magic',begin)
    arrays=',\n'.join('{'+','.join(str(x)+'u' for x in data['crashRecord'])+'}' for _,_,data in recs)
    oracle_src=oracle_src[:begin]+f'    static const uint32_t target[4][17]={{{arrays}}};\n    int i=w3_family(); assert(i>=0 && i<4 && sizeof fm1_crash==sizeof target[i]);\n    memcpy(&fm1_crash,target[i],sizeof fm1_crash);\n'+oracle_src[end:]
    for n,fn in [(2,'fm1_fault(&fm1_crash)'),(3,'safe_main()'),(4,'fm1_main()')]:
        oracle_src=base.replace(oracle_src,'if (!setjmp(reset_destination)) '+fn+';',f'(void)w3_run({n});')
    p=d/'guard.c';p.write_text(oracle_src)
    env=dict(os.environ,ZIG_LOCAL_CACHE_DIR=str(out/'zig-cache'))
    if cache:env['ZIG_GLOBAL_CACHE_DIR']=str(cache)
    subprocess.run([str(zig),'cc','-target','wasm32-wasi','-mcpu=baseline',*ccflags,'-Wl,--strip-all','-Wl,-z,stack-size=4194304','-Wl,--export=__stack_pointer',str(p),'-o',str(out/'guard.wasm')],env=env,check=True)

if __name__=='__main__':
    p=argparse.ArgumentParser()
    for name in ['source','evidence','output','zig']:p.add_argument(name,type=Path)
    p.add_argument('--cache',type=Path)
    args=p.parse_args();main(args.source.resolve(),args.evidence.resolve(),args.output.resolve(),args.zig.resolve(),args.cache)
