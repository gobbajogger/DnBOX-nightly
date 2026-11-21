#!/usr/bin/env python3
"""Build the FWUI native-route, normal-startup and Chicago display probes for native and WASI."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

def replace(text, old, new):
    if text.count(old) != 1:
        raise ValueError('expected exactly one occurrence of '+old[:70])
    return text.replace(old,new)

imports = '''
#pragma push_macro("__attribute__")
#undef __attribute__
__attribute__((import_module("env"), import_name("capture"))) extern void w3_capture(const char *, const void *);
__attribute__((import_module("env"), import_name("w3_run"))) extern int w3_run(int);
__attribute__((import_module("env"), import_name("w3_jump"),noreturn)) extern void w3_jump(int);
__attribute__((import_module("env"), import_name("family"))) extern int w3_family(void);
#pragma pop_macro("__attribute__")
'''
calls = '''
#pragma push_macro("__attribute__")
#undef __attribute__
__attribute__((export_name("w3_call"))) void w3_call(int key)
#pragma pop_macro("__attribute__")
'''

def replace_shot(src):
    p=src/'tests/host/smc_ui_test.c'
    s=p.read_text()
    a=s.index('static void shot(const char *name)')
    b=s.index('static void setup(',a)
    p.write_text(s[:a]+imports+'static void shot(const char *name) { w3_capture(name,fb); }\n'+s[b:])

def route_wasm(src):
    p=src/'tests/ui_inventory/native_routes.c'
    s=replace(p.read_text(),'#include <setjmp.h>',imports)
    s=replace(s,'static jmp_buf reset_destination;','')
    a=s.index('static void capture(const char *name)')
    b=s.index('static uint32_t fm1_ms',a)
    s=s[:a]+'static void capture(const char *name) {w3_capture(name,pixels);}\n'+s[b:]
    a=s.index('    int destination = setjmp(reset_destination);')
    b=s.index('    if (s == FAULT) assert',a)
    s=s[:a]+'    int destination=w3_run(1);\n'+s[b:]
    s=re.sub(r'longjmp\(reset_destination,\s*(\d+)\)',r'w3_jump(\1)',s)
    s+=calls+'''{
        if (!key) fm1_cstart();
        else if (scenario == FAULT) fm1_fault(&fm1_crash);
        else if (scenario == UBOOT) enter_uboot("UBOOT");
        else safe_main();
        abort();
    }
'''
    p.write_text(s)
    p=src/'tests/ui_inventory/native_startup.inc';s=p.read_text()
    s=replace(s,'longjmp(reset_destination, 3)','w3_jump(3)')
    s=replace(s,'int endpoint = setjmp(reset_destination);\n    if (!endpoint) { fm1_cstart(); abort(); }','int endpoint=w3_run(0);')
    p.write_text(s)

def startup_wasm(src):
    p=src/'tests/ui_inventory/startup_loop.c'
    s=replace(p.read_text(),'#include <setjmp.h>','')
    s=replace(s,'static jmp_buf completed;','')
    s=re.sub(r'longjmp\(completed,\s*(\d+)\)',r'w3_jump(\1)',s)
    s=replace(s,'int exit_code=setjmp(completed);\n    if(!exit_code) { fm1_main(); abort(); }','int exit_code=w3_run(0);')
    s=replace(s,'const char *mode=getenv("STARTUP_CASE");','static const char *const cases[]={"normal","owned","picture","hold","last-release","recover","live-shadow"};\n    int i=w3_family(); CHECK(i>=0 && i<7); const char *mode=cases[i];')
    p.write_text(s+calls+'{(void)key; fm1_main(); abort();}\n')

def wave_probe(src):
    p=src/'firmware/src/app/ui.c'
    anchor='static UI_DRAW void draw_wave_glyph(int cx, int y, int shape, int mix, uint16_t col, uint16_t face)\n{'
    p.write_text(replace(p.read_text(),anchor,'static unsigned wave_probe_calls, wave_probe_hide;\n'+anchor+'\n    ++wave_probe_calls; if (wave_probe_hide) return;'))

def run(args):
    src=args.source.resolve();out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
    sys.path.insert(0,str(src/'tests/ui_inventory'))
    import native_routes, startup_loop
    normal = out/'native'; normal.mkdir(exist_ok=True)
    native_routes.compile_fixture(normal)
    subprocess.run([str(normal/'check')],cwd=normal,check=True)
    ref=out/'route-png';ref.mkdir(exist_ok=True)
    native_routes.compare(normal,ref)
    print('Native routes and all archived route comparisons passed',flush=True)
    startup_loop.headers(src,normal)
    # The retained host wrapper generates the original clip SMC include from firmware.
    awk = r"""/^static const char CK_FLD_N\[\] = /{print}
        /^static uint32_t ck_page_on\(void\)$/ || /^int smk_ck_smc_(turn|nav)\(/{on=1}
        on{print} on && /^}/{on=0}"""
    (normal/'clip_smc.inc').write_bytes(subprocess.check_output(['awk',awk,src/'firmware/src/app/main_fm1.c']))
    build=out/'source'
    # Never change the supplied checkout. Generated DSP and font headers from its native
    # host dependency bootstrap can be reused byte-for-byte after copying the source.
    for name in ['firmware','tests','host','experiments','assets','tools']:
        shutil.copytree(src/name,build/name,dirs_exist_ok=True)
    subprocess.run(['sh','host/build_host.sh','--generate-only'],cwd=build,check=True)
    wave_probe(build)
    env=dict(os.environ, W3_INCLUDE=str(normal), W3_OUT=str(out), W3_ZIG=str(args.zig.resolve()))
    if args.cache: env['ZIG_GLOBAL_CACHE_DIR']=str(args.cache.resolve())
    env['ZIG_LOCAL_CACHE_DIR']=str(out/'zig-cache')
    native_flags='cc -std=c99 -O1 -w -ffp-contract=off -DX0X_HOST -D_POSIX_C_SOURCE=200809L -Ifirmware/src -Ifirmware/src/app -Ifirmware/src/dsp -Ibuild/gen -I"$W3_INCLUDE"'
    wasm_flags='"$W3_ZIG" cc -target wasm32-wasi -mcpu=baseline -O1 -std=c99 -ffp-contract=off -w -DX0X_HOST -D_POSIX_C_SOURCE=200809L -Ifirmware/src -Ifirmware/src/app -Ifirmware/src/dsp -Ibuild/gen -I"$W3_INCLUDE" -Wl,--strip-all -Wl,-z,stack-size=4194304'
    for kind,unit in [('normal','startup_loop.c'),('wave','wave_fallback_frame.c')]:
        command='. tests/host/original_build.sh\n'+native_flags+' tests/ui_inventory/'+unit+' $ORIGINAL_FLAGS $ORIGINAL_SOURCES -lm -o "$W3_OUT"/'+kind
        subprocess.run(['sh','-ec',command],cwd=build,env=env,check=True)
    modes=['normal','owned','picture','hold','last-release','recover','live-shadow']
    for family in modes+['wave']:
        dest=out/'frames'/family;dest.mkdir(parents=True,exist_ok=True)
        subprocess.run([str(out/('wave' if family=='wave' else 'normal'))],env=dict(env,STARTUP_CASE=family,SMC_UI_SHOTS=str(dest)),check=True,stdout=subprocess.DEVNULL)
    replace_shot(build);route_wasm(build);startup_wasm(build)
    for kind,unit in [('routes','native_routes.c'),('normal','startup_loop.c'),('wave','wave_fallback_frame.c')]:
        if kind=='routes':
            command='"$W3_ZIG" cc -target wasm32-wasi -mcpu=baseline -O1 -std=c11 -ffp-contract=off -w -DX0X_HOST=1 -DBOARD_SMK37=1 -I"$W3_INCLUDE" -Ifirmware/src -Wl,--strip-all -Wl,-z,stack-size=4194304 -Wl,--export=__stack_pointer tests/ui_inventory/native_routes.c'
        else:
            command='. tests/host/original_build.sh\n'+wasm_flags+' tests/ui_inventory/'+unit+' $ORIGINAL_FLAGS $ORIGINAL_SOURCES -lm'
            if kind=='normal': command+=' -Wl,--export=__stack_pointer'
        subprocess.run(['sh','-ec',command+' -o "$W3_OUT"/'+kind+'.wasm'],cwd=build,env=env,check=True)
        print(kind,hashlib.sha256((out/(kind+'.wasm')).read_bytes()).hexdigest(),flush=True)
    return 0

if __name__=='__main__':
    p=argparse.ArgumentParser()
    for name in ['source','output','zig']: p.add_argument(name,type=Path)
    p.add_argument('--cache',type=Path)
    sys.exit(run(p.parse_args()))
