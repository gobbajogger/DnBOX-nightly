#!/usr/bin/env python3
"""Compile pinned 808 idle projections and compare an actual owner trace to Remote."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
import tempfile

PIN = "f1786ebec2616477163b62b029c7e77405a9c3de"
UI = "firmware/src/app/ui.c"
STAGES = "firmware/src/app/ui_drum_voice.inc"
DSP = "firmware/src/dsp"
REMOTE_MODULE = "web/product-site/remote/drum-clap-stages.mjs"
CURVE_FIELDS = ("delay", "rise_tau", "rise_end", "hold", "fall", "peak", "window", "elapsed", "level", "linear")
HELPERS = (
    (UI, "put_s", "static char *put_s(char *b, const char *s)"),
    (UI, "put_i", "static char *put_i(char *b, int v)"),
    (UI, "put_d1", "static char *put_d1(char *q, float x, int sign)"),
    (UI, "unit_value", "static void unit_value(int u, float x, char *num, char *unit)"),
    (UI, "physical_stage_label", "static UI_DRAW void physical_stage_label(char *label,int slot,char stage,int raw)"),
    (STAGES, "dv_curve_level", "static UI_DRAW float dv_curve_level(const drum_curve_t *v,float ms)"),
    (STAGES, "dv_bound_stage", "static UI_DRAW void dv_bound_stage(drum_curve_t *v,int stage,int top,int off,uint16_t col)"),
    (STAGES, "dv_nominal_stage_time", "static UI_DRAW void dv_nominal_stage_time(float ms,int y)"),
)
HEADER = br'''
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "fastmath.h"
#include "envelope_snapshot.h"
#include "x0x_param.h"
#define UI_DRAW
#define UI_FIRST_KNOB 5
#define SOUND_GRAY 1
#define SOUND_INK 2
static const int FONT_T;
static char nominal[32];
static void cv_poly_aa(float *points,int used,uint16_t color) {
    printf("curve %d",used);
    for(int i=0;i<used;i++)printf(" %.9g %.9g",points[2*i]-13.f,points[2*i+1]);
    puts("");
}
static void cv_text(int x,int y,const int *font,const char *s,uint16_t color) {
    if (strncmp(s,"99% ",4)==0) snprintf(nominal,sizeof nominal,"%s",s);
}
static void text_r(int x,int y,const int *font,const char *s,uint16_t color) {
    printf("end %s\n",s);
}
static void cv_rect(int x,int y,int w,int h,uint16_t color) {
    abort(); /* An idle projection must never request a live level marker. */
}
'''
DRIVER = br'''
static void read_curve(drum_curve_t *v) {
    unsigned linear;
    if(scanf("%f %f %f %f %f %f %f %f %f %u",&v->delay,&v->rise_tau,&v->rise_end,
             &v->hold,&v->fall,&v->peak,&v->window,&v->elapsed,&v->level,&linear)!=10)abort();
    v->linear=linear;
}
int main(void) {
    int select,param,raw,attack,decay;
    float unit_si;
    while(scanf("%d %d %d %d %d %f",&select,&param,&raw,&attack,&decay,&unit_si)==6) {
        drum_curve_t a,d;
        read_curve(&a);read_curve(&d);
        char number[32]={0},unit[16]={0},stage[32]={0};
        nominal[0]=0;
        unit_value(param==3?X0X_U_MS:X0X_U_PCT,unit_si,number,unit);
        physical_stage_label(stage,param==3?1:3,param==3?'A':'D',raw);
        if(param==3)dv_nominal_stage_time(a.rise_end,0);
        else if(select==0)dv_nominal_stage_time(d.fall*4.60517f,0);
        printf("case %d %d %d %d %d|%s%s|%s|%s\n",select,param,raw,attack,decay,number,unit,stage,nominal);
        if(select==1) {
            d.rise_tau=a.rise_tau;d.rise_end=a.rise_end;
            dv_bound_stage(&d,0,0,0,2);
        } else {
            dv_bound_stage(&a,1,0,0,2);dv_bound_stage(&d,2,0,0,2);
        }
    }
    return 0;
}
'''

def require(condition, reason):
    if not condition:
        raise ValueError(reason)

def git(root, *args):
    return subprocess.check_output(["git", "-C", root, *args])

def sha(data):
    return hashlib.sha256(data).hexdigest()

def compile_input(firmware):
    paths = (UI, STAGES, f"{DSP}/drum808.c", f"{DSP}/fastmath.h",
             f"{DSP}/envelope_snapshot.h", f"{DSP}/x0x_param.h")
    sources = {path: git(firmware, "show", f"{PIN}:{path}") for path in paths}
    for path, content in sources.items():
        require((firmware / path).read_bytes() == content, f"Working copy differs from pinned bytes: {path}")
    require(b"#define UI_FIRST_KNOB 5\n" in sources[UI], "Missing original Elite knob numbering")
    page_markers = (
        b"if(selected) {",
        b"decay.rise_tau=attack.rise_tau;decay.rise_end=attack.rise_end;",
        b"dv_bound_stage(&decay,0,116,off,col);",
        b"dv_bound_stage(&attack,1,100,off,col);",
        b"dv_nominal_stage_time(decay.fall*4.60517f,132-off);",
        b"dv_bound_stage(&decay,2,144,off,col);",
    )
    for marker in page_markers:
        require(marker in sources[STAGES], f"Missing original stage routing: {marker!r}")
    functions = {}
    for path, name, signature in HELPERS:
        original = sources[path]
        start = original.index(signature.encode() + b"\n{")
        end = original.index(b"\n}", start) + 2
        functions[name] = original[start:end]
    source = b"\n".join((HEADER, *functions.values(), DRIVER))
    return source, {key: sha(content) for key, content in sources.items()}, {
        name: {"sha256": sha(body), "bytes": len(body)} for name, body in functions.items()
    }

def owner_rows(trace_bytes):
    trace = json.loads(trace_bytes)
    require(trace.get("engine") == f"actual unmodified drum808.c {PIN}", "Owner trace has different firmware provenance")
    require(trace.get("previewStateUnchanged") is True, "Owner trace does not verify untouched state")
    require(trace.get("units") == {"percent": 1, "milliseconds": 4}, "Owner trace unit codes changed")
    factory = {}
    for row in trace["sequence"]:
        if row["event"] in ("factoryCLAP", "factoryMARAC"):
            factory[row["selector"]] = (row["fixedAttack"], row["selectedDecay"])
    require(factory == {0: (32, 64), 1: (32, 51)}, "Owner trace factory controls changed")
    rows = trace["previewSweep"]
    index = {(r["selection"], r["param"], r["raw"]): r for r in rows}
    order = [(selection, param, raw) for selection in (0, 1) for param in (2, 3) for raw in range(128)]
    require(len(rows) == len(index) == 512 and set(index) == set(order), "Owner trace is missing unique sweep cases")
    for (selection, param, raw), row in index.items():
        owner = 11 if param == 3 or selection == 1 else 12
        require(row["ownerPlusOne"] == owner, f"Wrong preview owner at {selection, param, raw}")
        require(row["uiUnit"] == (4 if param == 3 else 1), "Wrong declared control unit")
        curve = row["curveMs"]
        require(curve["elapsed"] == -1 and curve["linear"] == 0, "Expected the idle exponential preview")
        require(all(math.isfinite(curve[field]) for field in CURVE_FIELDS), "Nonfinite curve value")
        require(math.isfinite(row["uiValue"]), "Nonfinite unit value")

    def curve_line(row):
        return " ".join(str(row["curveMs"][field]) for field in CURVE_FIELDS)

    lines = []
    for selection, param, raw in order:
        factory_attack, factory_decay = factory[selection]
        attack = raw if param == 3 else factory_attack
        decay = raw if param == 2 else factory_decay
        lines.append(" ".join(map(str, (
            selection, param, raw, attack, decay, index[(selection, param, raw)]["uiValue"],
            curve_line(index[(selection, 3, attack)]), curve_line(index[(selection, 2, decay)])
        ))))
    return ("\n".join(lines) + "\n").encode()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("owner_trace", type=Path)
    parser.add_argument("firmware_checkout", type=Path)
    parser.add_argument("remote_checkout", type=Path)
    parser.add_argument("--cc", default=os.environ.get("CC", "cc"))
    parser.add_argument("--node", default=os.environ.get("NODE", "node"))
    args = parser.parse_args()
    firmware = args.firmware_checkout.resolve()
    remote = args.remote_checkout.resolve()
    require(git(firmware, "rev-parse", "HEAD").decode().strip() == PIN, "Firmware checkout is not the pinned commit")
    require(not git(firmware, "status", "--porcelain", "--untracked-files=no"), "Firmware checkout has tracked modifications")
    module = remote / REMOTE_MODULE
    module_before = module.read_bytes()
    remote_commit = git(remote, "rev-parse", "HEAD").decode().strip()
    module_status = git(remote, "status", "--porcelain", "--", REMOTE_MODULE).decode().strip()
    trace = args.owner_trace.read_bytes()
    stdin = owner_rows(trace)
    source, sources, helpers = compile_input(firmware)
    with tempfile.TemporaryDirectory(prefix="dnbox-clap-stage-replay-") as temp:
        work = Path(temp)
        probe = work / "probe.c"
        binary = work / "probe"
        results = work / "native.txt"
        probe.write_bytes(source)
        flags = ["-std=c11", "-O2", "-ffp-contract=off", "-DX0X_HOST"]
        subprocess.run([args.cc, *flags, "-I", firmware / DSP, probe, "-o", binary], check=True)
        native = subprocess.check_output([binary], input=stdin)
        results.write_bytes(native)
        comparison = subprocess.check_output([
            args.node, Path(__file__).resolve().with_name("compare.mjs"), module, results
        ], text=True)
    require(module.read_bytes() == module_before, "Remote module changed during replay")
    receipt = json.loads(comparison)
    receipt.update({
        "result": "PASS", "softwareOnly": True, "remoteHead": remote_commit,
        "remoteModule": {"path": REMOTE_MODULE, "sha256": sha(module_before), "status": module_status or "clean"},
        "ownerTraceSha256": sha(trace), "oracleStdinSha256": sha(stdin),
        "nativeRowsSha256": sha(native), "compiledProbeSha256": sha(source), "compilerFlags": flags,
        "sourceFiles": sources, "compiledOriginalFunctions": helpers,
        "scope": "The eight compiled function bodies are copied byte-for-byte from the pinned Git objects. The host adapter supplies page role routing and output sinks. This compares idle coordinates and readouts."
    })
    print(json.dumps(receipt, indent=2))

if __name__ == "__main__":
    main()
