"""Stage Remote control sources onto an already composed, writable firmware tree.
This does not run builds, fit analysis, host tests, emulators or publication.
"""
from argparse import ArgumentParser
from pathlib import Path
import shutil

p = ArgumentParser(description=__doc__)
p.add_argument("tree", type=Path)
p.add_argument("--sj6", type=Path, required=True, help="owner-specific compose adapter")
p.add_argument("--transport", type=Path, required=True, help="existing verified DNR3 header")
a = p.parse_args()
kit = Path(__file__).resolve().parent
app = a.tree / "firmware/src/app"
panel = app / "ui.c"
ui = panel.read_text()
if "int ui_remote_pref(" not in ui:
    raise SystemExit("compose generic DNR3 panel transport first; no fallback stub")
if '#include "remote_synth_panel.inc"' in ui:
    raise SystemExit("already staged: use a clean composed working tree")
for name, source in (
    ("remote_synth_panel.inc", kit / "remote_synth_panel.inc"),
    ("remote_s1_panel.inc", kit / "remote_s1_panel.inc"),
    ("remote_sj6_panel.inc", a.sj6),
    ("remote_dnr3.c", kit / "remote_dnr3_full.c"),
    ("remote_dnr3.h", a.transport),
):
    shutil.copyfile(source, app / name)
panel.write_text(ui + '\n#if X0X_REMOTE_DNR3 && X0X_REMOTE_TYPED_SYNTH\n'
                 '#include "remote_synth_panel.inc"\n#endif\n')
