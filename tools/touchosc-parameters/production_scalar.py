#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Pin the reviewed stock one-scalar binding for both Nightly and TouchOSC."""

import argparse
import hashlib
import json
from pathlib import Path
import zlib

SOURCE = "4eff776499ca70164e241cdf4faeecca352fc508"
NIGHTLY = "c7b026cf86b3e153dcb3c564ced8fce25b9b3880"
USB_RECEIPT_SOURCE = "d63620b9253fc3656c5a9200be3f4936ddb83bc1"
HOST = "c6279bcad53593d1ca29dc69ed3ef52e34eba496edafc8e2ab3b9e4bc201775f"
CRC = 0xECCA5979
LICENSE = "GPL-3.0-only"
CATALOG_REVIEW_SHA256 = "5ba03e8ab5923f4bb4d8ca479f137f3c118964108216298d1b4298328e92ad41"
# A separate exact client and layout approval is required for runtime delivery.
RUNTIME_REVIEW_SHA256 = None
INPUTS = {
    "remote-scalar-catalog.json": "4239d4ccfe7e1af267d176f439393e8c1a6164ccd89e94b9dc5550b7b4ae9cb5",
    "elite-usb.json": "a799dbe839fdace07f6fdac5bb68b9598239d62866112d55db438b65627356f3",
    "pro-usb.json": "59cf810974d5cdc9b28ca7a0f4a7593cfe94c6549a5482456b2c9bc53e065676",
    "chromium-native.json": "66aa5e7ab67d847c0d90177f8a09b5c042328d7b7f07222adee30641b247d32f",
    "packed-native.json": "c99bbf93fa5eaea9ea4812ec354c0f907ce74d176a6a050b87634e2ae6ab8e6e",
}
PACKAGES = {
    "elite-usb.json": "e69fbe4a9b9aa2333fa4c3e59610e3a0dff1e7e4580afbf02e4b10991890b107",
    "pro-usb.json": "23bd1b79c0647323b0e574ba42aec53e30e4565de07f2c8228be8a8f05b8a88e",
}
EMULATOR = "47587aba833096a6df95439657e0febd15ba40f4128576cbe9e40660a1eea8ab"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_pinned(path, expected):
    data = path.read_bytes()
    require(hashlib.sha256(data).hexdigest() == expected, f"Unreviewed evidence bytes: {path.name}")
    return json.loads(data)


def verify_evidence(directory):
    """Validate the exact shipped-source declaration and its existing test receipts."""
    data = {name: read_pinned(directory / name, expected) for name, expected in INPUTS.items()}
    catalog = data["remote-scalar-catalog.json"]
    canonical = json.dumps(catalog, sort_keys=True, separators=(",", ":")).encode()
    require(zlib.crc32(canonical) == CRC, "Firmware catalog CRC does not match")
    binding = {"id": 1, "kind": 1, "label": "909 MIX Level", "min": 0, "max": 127,
               "owner": "909", "parameter": "MX_LEVEL", "target": "T_MIX"}
    require(catalog == {"protocol": 2, "controls": [binding]}, "No reviewed scalar declaration")
    for name, package in PACKAGES.items():
        USB = data[name]
        require(USB["software_only"] is True and USB["transport"] == "emulated USB MIDI"
                and USB["emulator_sha256"] == EMULATOR and USB["fwsc_sha256"] == package,
                f"Package proof does not match: {name}")
        addressed = [[reply[k] for k in ("op", "status", "control", "revision", "value")] for reply in USB["replies"]]
        require(addressed == [
            [0, 0, 1, 1, CRC], [1, 0, 0, 1, 0], [2, 0, 1, 1, 75], [3, 1, 1, 2, 76],
            [2, 0, 1, 2, 76], [3, 1, 1, 3, 75], [2, 0, 1, 3, 75], [7, 0, 0, 3, 0], [3, 4, 1, 3, 0],
        ], f"Package transaction proof does not match: {name}")
    chromium = data["chromium-native.json"]
    require(chromium["nightly"] == NIGHTLY and chromium["software_only"] is True
            and chromium["host_sha256"] == HOST and chromium["shipping_catalog_admitted"] is False
            and not chromium["shipping"]["trace"] and not chromium["ambiguous"]["trace"]
            and chromium["candidate"]["trace"][0] == [0, 0, 1, CRC]
            and chromium["candidate"]["trace"][-1] == [7, 0, 3, 0]
            and not chromium["candidate"]["page_errors"], "Browser proof does not match")
    packed = data["packed-native.json"]
    require(packed["nightly"] == NIGHTLY and packed["catalog_crc"] == f"{CRC:08x}"
            and packed["test_only"] is True and packed["control"] == binding
            and not packed["cases"]["closed"]["trace"]
            and packed["cases"]["mismatch"]["trace"] == [["HELLO", 0, 1, 1, CRC]]
            and packed["cases"]["native"]["trace"][-1][0:2] == ["CLOSE", 0],
            "Packed Lua proof does not match")
    return {key: binding[key] for key in ("id", "kind", "label", "min", "max")}


def reviewed_bundle(directory, *, staging=False):
    """Allow opt-in software staging only while the reviewed runtime is on HOLD."""
    control = verify_evidence(directory)
    review = read_pinned(directory / "review.json", CATALOG_REVIEW_SHA256)
    require(review.get("schema") == "dnbox-independent-native-scalar-admission-review/1"
            and review.get("decision") == "APPROVE_EXACT_ONE_CONTROL_CATALOG_FOR_SOFTWARE_STAGING"
            and review.get("release_or_gh_pages_approval") is False
            and review["source"]["linked_firmware"] == SOURCE
            and review["source"]["nightly_client"] == NIGHTLY
            and review["source"]["firmware_evidence"] == USB_RECEIPT_SOURCE
            and review["source"]["host_adapter_sha256"] == HOST
            and review["catalog"]["source_json_sha256"] == INPUTS["remote-scalar-catalog.json"]
            and review["catalog"]["crc32_canonical_compact_json"] == f"{CRC:08x}"
            and review["catalog"]["count"] == 1
            and review["native_emulated_usb"]["elite"]["usb_receipt_sha256"] == INPUTS["elite-usb.json"]
            and review["native_emulated_usb"]["pro"]["usb_receipt_sha256"] == INPUTS["pro-usb.json"]
            and review["chromium_fixture"]["receipt_sha256"] == INPUTS["chromium-native.json"]
            and review["packed_touchosc_fixture"]["receipt_sha256"] == INPUTS["packed-native.json"],
            "Independent review does not cover these inputs")
    if not staging:
        require(RUNTIME_REVIEW_SHA256 is not None, "Runtime admission remains on HOLD pending exact client/layout approval")
        runtime = read_pinned(directory / "runtime-review.json", RUNTIME_REVIEW_SHA256)
        require(runtime.get("catalogReviewSha256") == CATALOG_REVIEW_SHA256
                and runtime.get("decision") == "APPROVE_EXACT_ONE_CONTROL_RUNTIME",
                "Runtime review does not cover the pinned catalog")
    return {
        "catalog": {"admitted": True, "count": 1, "crc": CRC, "controls": [control]},
        "admission": {"sourceSha": SOURCE, "reviewSha": CATALOG_REVIEW_SHA256, "catalogCrc": CRC,
                      "license": LICENSE, "packageReceiptSource": USB_RECEIPT_SOURCE,
                      "artifactProofs": INPUTS, "packageSha256": PACKAGES, "softwareOnly": True,
                      "staging": staging},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("evidence", type=Path)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check-evidence", action="store_true")
    mode.add_argument("--browser-module", type=Path)
    mode.add_argument("--staging-browser-module", type=Path, help="Local opt-in software candidate only")
    args = parser.parse_args()
    try:
        if args.check_evidence:
            verify_evidence(args.evidence)
            print(f"Verified source and software evidence for one scalar, CRC {CRC:08x}")
        else:
            bundle = reviewed_bundle(args.evidence, staging=args.staging_browser_module is not None)
            with (args.staging_browser_module or args.browser_module).open("x") as file:
                file.write("// SPDX-License-Identifier: GPL-3.0-only\n")
                file.write("// Generated by tools/touchosc-parameters/production_scalar.py.\n")
                file.write("export const REVIEWED_BUNDLE = " + json.dumps(bundle, indent=2) + ";\n")
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
