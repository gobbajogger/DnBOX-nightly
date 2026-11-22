#!/usr/bin/env python3
"""Verify Master More and FX Tone geometry and units against pinned source C."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile

PIN = "f1786ebec2616477163b62b029c7e77405a9c3de"
HEAD = "3c5a9142b5013ffc6d5178825a0e4fc10692be4e"

def git(path, *args):
    return subprocess.check_output(["git", "-C", path, *args])

def sha(value):
    return hashlib.sha256(value).hexdigest()

def section(text, first, last):
    start = text.index(first)
    return text[start:text.index(last, start)]

def function(text, declaration):
    return section(text, declaration + "\n{", "\n}") + "\n}"

def oracle(firmware):
    root = "firmware/src/"
    names = ("app/ui.c","dsp/master.c","dsp/master.h","dsp/fxbus.c","dsp/fxbus.h",
             "dsp/drum909.c","dsp/fastmath.h","dsp/x0x_param.h","x0x_cold.h")
    sources = {}
    for name in names:
        data = git(firmware, "show", f"{PIN}:{root}{name}")
        if (firmware / (root+name)).read_bytes() != data:
            raise ValueError(f"Changed pinned firmware input: {name}")
        sources[name] = data
    ui = sources["app/ui.c"].decode()
    fx = sources["dsp/fxbus.c"].decode()
    headers = sources["dsp/fxbus.h"].decode()
    drums = sources["dsp/drum909.c"].decode()
    bar = section(ui, "        if (has_bar) {\n            int v = pref_get(r);", "\n    }\n    if (ui.list_n > visible)")
    pips = section(ui, "            int n = d->max + 1, k, pw", "\n        }\n        pref_value_of(r,val")
    tone = section(ui, "        int pivot=left+7+q*20/127;", "    } else if(d && d->names")
    list_condition = "int has_bar = d && !d->names && d->max >= 24;"
    assert list_condition in ui
    fx_table = "\n".join(line for line in fx.splitlines() if re.search(r"\[FX_(VOLUME|DIST|COMP)\]",line))
    assert len(fx_table.splitlines()) == 3
    parts = {
        "draw_list/bar":bar,
        "draw_knobs/named_pips":pips,
        "control_glyph/fx_tone":tone,
        "draw_list/descriptor_kind":list_condition,
        "fxbus_param_si":function(fx,"X0X_COLD int fxbus_param_si(int i, int pot, float *val)"),
        "fxbus_descriptors":fx_table,
        "named_distortion_modes":re.search(r"const char \*const x0x_dist_names\[8\] = \{[\s\S]*?\};",drums)[0],
        "box_radius":next(line for line in ui.splitlines() if line.startswith("static int32_t rad_of(")),
        "box":next(line for line in ui.splitlines() if line.startswith("static void box(")),
    }
    for decl in (
        "static char *put_s(char *b, const char *s)",
        "static char *put_i(char *b, int v)",
        "static char *put_d1(char *q, float x, int sign)",
        "static void unit_value(int u, float x, char *num, char *unit)",
    ):
        parts[decl.split("(")[0].split()[-1].strip("*")] = function(ui, decl)
    assert "r = w / 2;" in ui and "r = h / 2;" in ui
    assert "MST_PUMPSRC), PR(R_ENG, T_MST, 0, MST_RESO), PR(R_ENG, T_MST, 0, MST_LIMIT)" in ui
    assert "FX_DIST), PR(R_ENG, T_FX, 0, FX_COMP), PR(R_ENG, T_FX, 0, FX_VOLUME)" in ui
    enum = re.search(r"enum \{ FX_VOLUME[\s\S]*?\};",headers)[0]
    type_def = section(fx,"enum { CV_LIN, CV_EXP, CV_SW };","\n\nstatic const char *const fx_div_names")
    start = r'''
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include "master.c"
#define C_LINE 0
#define C_DIM 1
#define C_PRIMARY 1
static void rbox(int x,int y,int w,int h,int radius,uint16_t color) {
    if(radius>w/2)radius=w/2;
    if(radius>h/2)radius=h/2;
    printf(" %d,%d,%d,%d,%d,%u",x,y,w,h,radius,color);
}
static uint16_t part_col(void){return C_PRIMARY;}
static int stored;
static int pref_get(int r){return stored;}
static void cv_line(int x,int y,int x2,int y2,int color) {
    printf(" %d,%d,%d,%d,%d",x,y,x2,y2,color);
}
static void cv_rect(int x,int y,int w,int h,int color) {
    assert(h==1);
    cv_line(x,y,x+w-1,y,color);
}
static float x0x_pot_exp_value(int table,int raw){abort();}
'''
    driver = r'''
static void list_bar(const x0x_param_t *d,int raw) {
    int r=0,y=0,sel=1;
    stored=raw;
    BODY_CONDITION
BODY_BAR
}
static void named_pips(const x0x_param_t *d,int val) {
    int cx=20,col=C_PRIMARY;
BODY_PIPS
}
static void tone_path(int q) {
    int left=2,right=38,col=C_PRIMARY;
BODY_TONE
}

int main(void) {
    const int addresses[][2]={{6,0},{6,1},{6,2},{6,3},{6,4},{6,5},{6,7},{6,10},{6,11},{4,1},{4,3},{4,0}};
    master_t m={0};
    for(unsigned i=0;i<sizeof addresses/sizeof addresses[0];i++) {
        int target=addresses[i][0],param=addresses[i][1];
        const x0x_param_t *d=target==6?master_param(param):&fx_p[param].ui;
        for(int raw=0;raw<=d->max;raw++){
            char number[64]={0},unit[16]={0};
            if(target==6){
                m.pot[param]=raw;
                master_format(&m,param,number);
            }else if(d->names)put_s(number,d->names[raw]);
            else{
                float value=0;
                const int u=fxbus_param_si(param,raw,&value);
                unit_value(u,value,number,unit);
            }
            printf("MORE|%d:%d|%d|%d|%s%s|",target,param,raw,d->max,number,unit);
            list_bar(d,raw);
            putchar('|');
            if(d->names)named_pips(d,raw);
            puts("");
        }
    }
    for(int raw=0;raw<=127;raw++) {
        printf("TONE|%d|",raw);
        tone_path(raw);
        puts("");
    }
}
'''.replace("BODY_CONDITION",list_condition).replace("BODY_BAR",bar).replace("BODY_PIPS",pips).replace("BODY_TONE",tone)
    helpers = "\n".join(parts[key] for key in ("put_s","put_i","put_d1","unit_value","box_radius","box"))
    c = "\n".join((start,enum,type_def,parts["named_distortion_modes"],"static const fx_pspec_t fx_p[FX_NPARAMS]={",
                   fx_table,"};",parts["fxbus_param_si"],helpers,driver))
    return c, {name:sha(data) for name,data in sources.items()}, {name:sha(body.encode()) for name,body in parts.items()}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("firmware",type=Path)
    parser.add_argument("remote",type=Path)
    args=parser.parse_args()
    firmware,remote=args.firmware.resolve(),args.remote.resolve()
    if git(firmware,"rev-parse","HEAD").decode().strip()!=PIN:
        raise ValueError("Expected exact pinned firmware checkout")
    compiled,sources,parts=oracle(firmware)
    with tempfile.TemporaryDirectory(prefix="dnbox-more-role-oracle-") as tmp:
        temp=Path(tmp)
        c,binary,rows=temp/"oracle.c",temp/"oracle",temp/"native.txt"
        c.write_text(compiled)
        flags=["-std=c11","-O2","-DX0X_HOST","-ffp-contract=off"]
        subprocess.run(["cc",*flags,"-I",firmware/"firmware/src/dsp",c,"-o",binary],check=True)
        rows.write_bytes(subprocess.check_output([binary]))
        output=json.loads(subprocess.check_output(["node",Path(__file__).with_name("compare.mjs"),remote,rows]))
        output.update({
            "result":"PASS","softwareOnly":True,
            "firmwareHead":PIN,"remoteBase":HEAD,"testedRemoteHead":git(remote,"rev-parse","HEAD").decode().strip(),
            "sources":sources,"exactSections":parts,"compiledCSha256":sha(c.read_bytes()),"flags":flags,
            "nativeRowsSha256":sha(rows.read_bytes()),
            "scope":"Actual f178 More bar and formatter, native named selector pips projected into Remote card context, actual three FX lowpass roles. No browser or hardware proof."
        })
    print(json.dumps(output,indent=2))

if __name__=="__main__":
    main()
