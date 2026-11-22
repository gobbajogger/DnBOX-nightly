#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Inventory committed visual references without treating missing Remote images as approval.

This does NOT capture screenshots, compare the owner's PDF, or prove a browser gate.
Run from the repository: python3 tests/visual/check_reference_inventory.py
For final qualification: python3 tests/visual/check_reference_inventory.py --require-complete
"""
import argparse
import ast
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SIZES = ("1440x900", "1024x640", "844x390", "390x844")


def visual_inputs(source):
    module = ast.parse(source)
    constants = {}
    for node in module.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id in {"SIZES", "SITE", "OFFLINE"}:
                    constants[target.id] = ast.literal_eval(node.value)
    if set(constants) != {"SIZES", "SITE", "OFFLINE"}:
        raise ValueError("missing visual gate schedule constants")
    if [f"{w}x{h}" for w, h in constants["SIZES"]] != list(SIZES):
        raise ValueError("visual gate viewport schedule changed; reconcile references")
    funcs = [n for n in module.body if isinstance(n, ast.FunctionDef) and n.name == "remote_states"]
    if len(funcs) != 1:
        raise ValueError("missing or duplicate remote_states schedule")
    remote = []
    for node in funcs[0].body:
        if (isinstance(node, ast.Assign) and len(node.targets) == 1 and
                isinstance(node.targets[0], ast.Name) and node.targets[0].id == "st"):
            remote += [ast.literal_eval(row.elts[0]) for row in node.value.elts]
        elif isinstance(node, ast.For) and isinstance(node.target, ast.Name) and node.target.id == "t":
            remote += ast.literal_eval(node.iter)
    if len(remote) != len(set(remote)) or not remote:
        raise ValueError("unable to prove unique Remote visual states")
    return constants["SITE"], constants["OFFLINE"], remote


def inventory(root=ROOT):
    source = (root / "tests/visual/visual_gate.py").read_text()
    sites, offline, remote = visual_inputs(source)
    site_names = ["site-" + rel.replace("/index.html", "").replace("/", "-").replace(".html", "")
                  for rel in sites + ["remote/device/index.html"]]
    offline_names = ["offline-" + rel.replace(".html", "") for rel in offline]
    remote_names = ["remote-" + name for name in remote]
    expected = {p + "-" + size + ".png" for p in site_names + offline_names + remote_names for size in SIZES}
    snapshot_path = root / "tests/visual/__snapshots__"
    present = {p.name for p in snapshot_path.glob("*.png")}
    missing = sorted(expected - present)
    unexpected = sorted(present - expected)
    missing_remote = [p for p in missing if p.startswith("remote-")]
    return {
        "expected_count": len(expected), "registered_count": len(present & expected),
        "missing_count": len(missing), "remote_state_count": len(remote),
        "remote_missing_count": len(missing_remote),
        "remote_missing": missing_remote, "all_missing": missing, "unexpected": unexpected,
        "complete": not missing and not unexpected,
        "note": "Reference inventory only; source/capture/PDF reviewer acceptance must be proved separately"
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-complete", action="store_true")
    parser.add_argument("--root", type=Path, default=ROOT)
    args = parser.parse_args()
    result = inventory(args.root)
    print(json.dumps(result, indent=2))
    return int(bool(result["unexpected"] or (args.require_complete and result["missing_count"])))


if __name__ == "__main__":
    raise SystemExit(main())
