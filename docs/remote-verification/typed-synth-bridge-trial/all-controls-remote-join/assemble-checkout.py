"""Compose source into a fresh disposable checkout, never run a build.

Inputs are the restored forward control source, the existing guarded release
scaffold, and separately reconciled UI and DNR3 transport source. This is an
overlay, not a historical checkout claim. No generated outputs or Git metadata
are copied. An incomplete donor is refused explicitly.
"""
import argparse
from pathlib import Path
import shutil

p = argparse.ArgumentParser(description=__doc__)
p.add_argument("scaffold", type=Path)
p.add_argument("controls", type=Path)
p.add_argument("ui", type=Path)
p.add_argument("out", type=Path)
p.add_argument("--sj6", type=Path, required=True)
p.add_argument("--transport", type=Path, required=True,
               help="prepared directory mirroring tree-relative patched source")
a = p.parse_args()
r = a.out
if r.exists():
    raise SystemExit("choose a new output tree; existing work is untouched")
if not a.ui.is_file() or not a.sj6.is_file():
    raise SystemExit("the composed physical UI or SuperJ6 registry is missing")
app = Path("firmware/src/app")
white = [app/"editor.c", app/"remote_dnr3.h", Path("firmware/src/x0x.c"),
         Path("tools/build.py")]
for rel in white:
    if not (a.transport / rel).is_file():
        raise SystemExit(f"missing reconciled transport source: {rel}")
shutil.copytree(a.scaffold, r, symlinks=True,
                ignore=shutil.ignore_patterns(".git","build","*.orig","*.rej",
                                              "__pycache__","combined-link-proof"))
for rel in ("firmware", "tools", "assets", "experiments", "ble"):
    src = a.controls / rel
    if src.is_dir():
        shutil.copytree(src, r / rel, dirs_exist_ok=True, symlinks=True,
                        ignore=shutil.ignore_patterns("*.orig","*.rej","__pycache__"))
for source in a.transport.rglob("*"):
    if source.is_file():
        rel = source.relative_to(a.transport)
        if rel.suffix not in (".c",".h",".inc",".py") or rel.parts[0] not in ("firmware","tools"):
            continue
        dest = r / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source,dest)
shutil.copyfile(a.ui,r / app / "ui.c")
