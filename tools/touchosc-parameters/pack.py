#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Generate a fail-closed TouchOSC parameter layout or its archived-host qualification variant."""

import argparse
import json
from pathlib import Path
import struct
import subprocess
import uuid
from xml.dom import minidom
import zlib

HERE = Path(__file__).resolve().parent
HOST_SOURCE = "246ea3718c6c72ba80bbd1aafcd5356f871c78c8"
HOST_SCHEMA = "dnbox-actual-scalar-host-v1"
HOST_COUNT = 326
HOST_CRC = 0xEEC38BC1
NAMESPACE = "https://github.com/gobbajogger/DnBOX-nightly/touchosc-parameters/"
DRUM_VOICES = (
    ("Kick", "Snare", "Low Tom", "Mid Tom", "High Tom", "Rim", "Clap", "Closed Hat", "Open Hat", "Crash", "Ride", "Kit"),
    ("Kick", "Snare", "Low Tom", "Mid Tom", "High Tom", "Rim", "Clap", "Cowbell", "Cymbal", "Open Hat", "Closed Hat", "Kit"),
)
MIX_PARTS = ("909", "808", "Bass A", "Bass B", "BREAK")


def descriptor_role(target, voice, bank):
    if target in (0, 1) and 0 <= voice < 12 and bank == -1:
        return f"{('909', '808')[target]} {DRUM_VOICES[target][voice]}"
    if target == 2 and voice in (0, 1) and bank in (0, 1):
        return f"{('Chicago', 'Miami')[bank]} {'AB'[voice]}"
    if target == 5 and 0 <= voice < len(MIX_PARTS) and bank == -1:
        return f"Mix {MIX_PARTS[voice]}"
    if target in (3, 4, 6) and voice == 0 and bank == -1:
        return {3: "BREAK", 4: "FX", 6: "Master"}[target]
    raise ValueError(f"Unmapped source role for target {target}, voice {voice}, bank {bank}")


def archived_catalog(firmware):
    """Pull explicit descriptors from the executable, never infer IDs from ranges."""
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=firmware, text=True).strip()
    if head != HOST_SOURCE:
        raise ValueError("wrong archived firmware source")
    subprocess.run(["git", "diff", "--quiet", "HEAD", "--"], cwd=firmware, check=True)
    binary = firmware / "build/host/remote-actual-core/test"
    catalog = json.loads(subprocess.check_output([binary, "--catalog"], timeout=30))
    if (catalog["schema"], catalog["count"], catalog["crc"], catalog["testOnly"], catalog["admitted"],
        catalog["nativeAdmitted"]) != (HOST_SCHEMA, HOST_COUNT, HOST_CRC, True, False, False):
        raise ValueError("unexpected source catalog or admitted flag")
    controls = catalog["controls"]
    if len(controls) != HOST_COUNT:
        raise ValueError("incomplete source catalog")
    content = bytearray(HOST_SCHEMA.encode() + b"\0")
    identities = set()
    for i, control in enumerate(controls, 1):
        target, voice, bank = (control[key] for key in ("target", "voice", "bank"))
        label = control["label"]
        if (control["id"] != i or control["kind"] != 1 or control["min"] != 0 or
            not 0 <= control["max"] < 2**32 or not isinstance(label, str) or not label or
            "\0" in label or (target, voice, control["parameter"], bank) in identities):
            raise ValueError(f"invalid source descriptor {i}")
        identities.add((target, voice, control["parameter"], bank))
        content.extend(struct.pack("<8I", i, 1, target, voice, control["parameter"], bank + 1, 0, control["max"]))
        content.extend(label.encode() + b"\0")
        control["role"] = descriptor_role(target, voice, bank)
    if zlib.crc32(content) != HOST_CRC:
        raise ValueError("descriptor bytes do not match the archived source CRC")
    return catalog


def lua_string(text):
    # Byte escapes preserve UTF-8 and are supported by Lua 5.1.
    return '"' + ''.join(chr(b) if 32 <= b < 127 and b not in (34, 92) else f"\\{b:03d}"
                         for b in text.encode()) + '"'


def controller_script(catalog):
    crc, entries = (catalog["crc"], catalog["controls"]) if catalog else (0, [])
    rows = [f"local catalogCrc = {crc}", "local descriptors = {"]
    for d in entries:
        numbers = ", ".join(f"{key} = {d[key]}" for key in ("id", "kind", "min", "max", "target", "voice", "parameter", "bank"))
        rows.append("  {" + numbers + f", label = {lua_string(d['label'])}, role = {lua_string(d['role'])}" + "},")
    return "\n".join(rows + ["}", (HERE / "controller.lua").read_text(encoding="utf-8")])


def make_layout(catalog=None):
    # LexML packing follows the existing GPL TouchOSC document representation.
    doc = minidom.Document()
    lexml = doc.createElement("lexml")
    lexml.setAttribute("version", "5")
    doc.appendChild(lexml)

    def element(parent, name, value=None, cdata=False):
        child = doc.createElement(name)
        parent.appendChild(child)
        if value is not None:
            child.appendChild(doc.createCDATASection(value) if cdata else doc.createTextNode(str(value)))
        return child

    def control(parent, name, kind, frame, text="", script=None):
        node = element(parent, "node")
        node.setAttribute("ID", str(uuid.uuid5(uuid.NAMESPACE_URL, NAMESPACE + name)))
        node.setAttribute("type", kind)
        is_button = kind == "BUTTON"
        is_label = kind == "LABEL"
        enabled = bool(catalog) and is_button
        props = {
            "background": ("b", 0 if is_label else 1), "color": ("c", (0.08, 0.14, 0.16, 1)),
            "cornerRadius": ("f", 8), "frame": ("r", frame), "grabFocus": ("b", int(enabled)),
            "interactive": ("b", int(enabled)), "locked": ("b", 0), "name": ("s", name),
            "orientation": ("i", 0), "outline": ("b", int(is_button)), "outlineStyle": ("i", 1),
            "pointerPriority": ("i", 0), "shape": ("i", 1), "visible": ("b", 1),
        }
        if is_button:
            props.update({"buttonType": ("i", 0), "press": ("b", 1), "release": ("b", 1), "valuePosition": ("b", 0)})
        if is_label:
            props.update({"font": ("i", 0), "textAlignH": ("i", 2), "textAlignV": ("i", 2), "textClip": ("b", 1),
                          "textColor": ("c", (0.93, 0.97, 0.96, 1)), "textLength": ("i", 0), "textSize": ("i", 18)})
        if script:
            props["script"] = ("s", script)
        properties = element(node, "properties")
        for key, (value_type, value) in sorted(props.items()):
            prop = element(properties, "property")
            prop.setAttribute("type", value_type)
            element(prop, "key", key, cdata=True)
            if value_type in ("r", "c"):
                target = element(prop, "value")
                for field, part in zip("xywh" if value_type == "r" else "rgba", value):
                    element(target, field, part)
            else:
                element(prop, "value", value, cdata=value_type == "s")
        values = element(node, "values")
        defaults = {"touch": "false"}
        if is_button:
            defaults["x"] = "0"
        if is_label:
            defaults["text"] = text
        for key, value in sorted(defaults.items()):
            entry = element(values, "value")
            element(entry, "key", key, cdata=True)
            element(entry, "locked", 0)
            element(entry, "lockedDefaultCurrent", 0)
            element(entry, "default", value, cdata=True)
            element(entry, "defaultPull", 0)
        return node

    root = control(lexml, "dnbox_parameters", "GROUP", (0, 0, 480, 588), script=controller_script(catalog))
    children = element(root, "children")
    control(children, "title", "LABEL", (16, 12, 448, 42), "DNBOX / PARAMETERS")
    if not catalog:
        control(children, "status", "LABEL", (16, 56, 448, 42), "Parameter binding unavailable")
        return doc.toxml(encoding="utf-8")
    control(children, "route", "LABEL", (16, 56, 448, 42), "Archived host · test only · MIDI connection 1")
    control(children, "status", "LABEL", (16, 100, 448, 42), "Disconnected")
    control(children, "parameter", "LABEL", (16, 220, 448, 42), "Parameter")
    control(children, "range", "LABEL", (16, 264, 448, 42), "Raw range")
    control(children, "stored", "LABEL", (16, 394, 216, 42), "Stored —")
    control(children, "draft", "LABEL", (248, 394, 216, 42), "Proposed —")
    script = (HERE / "button.lua").read_text(encoding="utf-8")

    def buttons(y, row):
        gap = 8
        width = (448 - gap * (len(row) - 1)) // len(row)
        for index, (name, label) in enumerate(row):
            frame = (16 + (width + gap) * index, y, width, 60)
            control(children, name, "BUTTON", frame, script=script)
            control(children, name + "_label", "LABEL", frame, label)

    buttons(150, [("connect", "Connect"), ("read", "Read"), ("disconnect", "Close")])
    buttons(316, [("previous_group", "−16"), ("previous", "Previous"), ("next", "Next"), ("next_group", "+16")])
    buttons(444, [("decrease_coarse", "−8"), ("decrease", "−1"), ("increase", "+1"), ("increase_coarse", "+8")])
    buttons(512, [("apply", "Apply"), ("undo", "Undo")])
    return doc.toxml(encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--archived-host", type=Path, help="Pinned checkout with built C pilot, for software qualification only")
    args = parser.parse_args()
    if args.output.suffix not in (".xml", ".tosc"):
        parser.error("output must end in .xml or .tosc")
    xml = make_layout(archived_catalog(args.archived_host.resolve()) if args.archived_host else None)
    with args.output.open("xb") as target:
        target.write(zlib.compress(xml, level=9) if args.output.suffix == ".tosc" else xml)


if __name__ == "__main__":
    main()
