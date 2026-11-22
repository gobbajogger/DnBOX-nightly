#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Select the exact reviewed branch-only workspace catalog and TouchOSC document."""
import argparse
from contextlib import suppress
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "evidence/integ-resume/branch-scalar-54266973"
REVIEW_SHA256 = "0374fa7b916bf6515af8ebb8d8c15c31aa3dc7b8fb41035320659634359777ea"
FIRMWARE = "54266973cf5f6893bbddae84920bea1db55e8f4a"
ARTIFACTS = ("candidate-catalog.mjs", "reviewed-scalar-staging.tosc")


def pinned(path, expected):
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != expected:
        raise ValueError(f"Reviewed bytes changed: {path.name}")
    return data


def select(name):
    if not name or name in (".", "..") or Path(name).name != name:
        raise ValueError("Choose a new directory name inside .output")
    review_bytes = pinned(EVIDENCE / "runtime-review.json", REVIEW_SHA256)
    review = json.loads(review_bytes)
    if (review["decision"] != "APPROVE_EXACT_BRANCH_ONLY_OPT_IN_ARTIFACT_SELECTION"
            or review["firmware"]["published"] != FIRMWARE
            or review["publicReleaseAndPages"] != "HOLD"
            or review["defaultRuntimeEnablement"] != "HOLD"):
        raise ValueError("Expected exact software branch-only approval")

    reviewed = review["nightly"]
    manifest = ROOT / "web/product-site/SOURCE-MANIFEST.json"
    manifest_value = json.loads(manifest.read_bytes())
    if manifest_value["publicationQualified"] is not False:
        raise ValueError("Expected an unpublished source manifest")
    rows = {row["path"]: row for row in manifest_value["files"]}
    if len(rows) != len(manifest_value["files"]):
        raise ValueError("Duplicate product source paths")
    for relative, digest in reviewed["reviewedPatchedSourceSha256"].items():
        source = ROOT / relative
        if source == manifest:
            # The combined manifest changes whenever disjoint Web sources change.
            continue
        data = pinned(source, digest)
        site_path = source.relative_to(manifest.parent) if manifest.parent in source.parents else None
        if site_path and rows[site_path.as_posix()]["sha256"] != digest:
            raise ValueError(f"Merged source manifest differs: {site_path}")
        if site_path and rows[site_path.as_posix()]["bytes"] != len(data):
            raise ValueError(f"Merged source length differs: {site_path}")

    artifacts = {artifact: pinned(EVIDENCE / artifact, reviewed["replayedArtifactsSha256"][artifact])
                 for artifact in ARTIFACTS}
    base = ROOT / ".output"
    if base.is_symlink():
        raise ValueError("Refusing a symlink product output directory")
    base.mkdir(exist_ok=True)
    target = base / name
    target.mkdir()
    created = []
    try:
        for artifact, data in {**artifacts, "runtime-review.json": review_bytes}.items():
            path = target / artifact
            with path.open("xb") as stream:
                created.append(path)
                stream.write(data)
    except OSError:
        for path in created:
            with suppress(OSError):
                path.unlink()
        with suppress(OSError):
            target.rmdir()
        raise
    return target


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("name", help="New output directory name under .output")
    args = parser.parse_args()
    try:
        print(select(args.name))
    except (OSError, ValueError, KeyError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
