#!/usr/bin/env python3
"""Reproduce the firmware amount and compressor glyph proof."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

PIN = "f1786ebec2616477163b62b029c7e77405a9c3de"
UI = "firmware/src/app/ui.c"
MATH = "firmware/src/dsp/fastmath.h"
BODIES = {
    "drive_amount_glyph": (b"static UI_DRAW void drive_amount_glyph(", b"\nstatic UI_DRAW void loop_identity_glyph"),
    "all_glyph_semantics/reverb_decay": (b"  float a=18,fb=", b" }else if(r.kind==R_SPAT"),
    "perform_glyph/pump": (b"        int depth=val*14/127;", b"    } else return 0;"),
    "comp_glyph_output": (b"static UI_DRAW float comp_glyph_output(", b"\nstatic UI_DRAW int semantic_amount_glyph("),
    "semantic_amount_glyph/comp_transfer": (
        b"  static const float ratios[]={1,1.5f,2,3,4,6,8,12,20,1e6f};",
        b" } else if(r.kind==R_ENG && r.a==T_FX && r.c==FX_DL_FDBK)"
    ),
}

def git(root, *args):
    return subprocess.check_output(["git", "-C", root, *args])

def sha(data):
    return hashlib.sha256(data).hexdigest()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("firmware", type=Path)
    parser.add_argument("remote", type=Path)
    args = parser.parse_args()
    firmware, remote = args.firmware.resolve(), args.remote.resolve()
    if git(firmware, "rev-parse", "HEAD").decode().strip() != PIN:
        raise ValueError("Expected the pinned firmware checkout")
    sources = {name:git(firmware,"show",f"{PIN}:{name}") for name in (UI,MATH)}
    for name,data in sources.items():
        if (firmware/name).read_bytes()!=data:
            raise ValueError(f"Working copy differs from pinned bytes: {name}")
    directory = Path(__file__).resolve().parent
    c_source = (directory/"oracle.c").read_bytes()
    verified_bodies = {}
    for name,(first,last) in BODIES.items():
        start = sources[UI].index(first)
        section = sources[UI][start:sources[UI].index(last,start)]
        if section not in c_source:
            raise ValueError(f"Oracle C drawing differs from pinned source: {name}")
        verified_bodies[name] = sha(section)
    with tempfile.TemporaryDirectory(prefix="dnbox-master-role-replay-") as folder:
        work = Path(folder)
        binary = work/"oracle"
        subprocess.run(["cc","-std=c11","-O2","-ffp-contract=off","-DX0X_HOST","-I",
                        firmware/"firmware/src/dsp",directory/"oracle.c","-o",binary],check=True)
        amounts = work/"amounts.txt"
        transfer = work/"transfer.bin"
        amounts.write_bytes(subprocess.check_output([binary]))
        transfer.write_bytes(subprocess.check_output([binary,"--compressor"]))
        run = subprocess.check_output(["node",directory/"compare.mjs",remote,amounts,transfer],text=True)
    receipt = json.loads(run)
    receipt.update({
        "result":"PASS", "softwareOnly":True, "firmwareHead":PIN,
        "remoteHead":git(remote,"rev-parse","HEAD").decode().strip(),
        "remoteModuleHashes":{
            name:sha((remote/"web/product-site/remote"/name).read_bytes())
            for name in ("glyph-render.mjs","glyph-live.mjs","master-draft.mjs")
        },
        "firmwareSourceHashes":{name:sha(data) for name,data in sources.items()},
        "verifiedCBodyHashes":verified_bodies,
        "scope":"Normalized stroke paths and guides from original C expressions. No live gain reduction, browser pixels or physical proof."
    })
    print(json.dumps(receipt,indent=2))

if __name__=="__main__":
    main()
