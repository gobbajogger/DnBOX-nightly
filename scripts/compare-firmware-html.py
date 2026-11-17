#!/usr/bin/env python3
"""Strict W3 pixel/inventory comparison. Does not grant visual review or publication."""
import argparse
import io
import hashlib
import json
from pathlib import Path
import re
import subprocess
from PIL import Image

SHA = re.compile(r'^[0-9a-f]{40}$')
HASH = re.compile(r'^[0-9a-f]{64}$')

def verify_inventory_provenance(repo, inventory, firmware_sha, harness_path):
    """Verify Git identity only; the reviewer still verifies inventory derivation."""
    errors = []
    resolved = None
    if not isinstance(inventory, dict):
        inventory = {}; errors.append('inventory object required')
    if not isinstance(firmware_sha, str) or not SHA.fullmatch(firmware_sha):
        errors.append('exact firmware commit required')
    if inventory.get('productionSourceCommit') != firmware_sha:
        errors.append('inventory production source mismatch')
    if inventory.get('sourceInventoryCommit', firmware_sha) != firmware_sha:
        errors.append('runtime and inventory harness must share one source commit')
    if inventory.get('sourceInventoryPath', harness_path) != harness_path:
        errors.append('inventory harness path mismatch')
    blob = inventory.get('sourceInventoryGitBlob')
    if not isinstance(blob, str) or not SHA.fullmatch(blob):
        errors.append('exact harness blob required')
    if (not isinstance(harness_path, str) or not harness_path or '\\' in harness_path
            or any(ord(c) < 32 for c in harness_path) or harness_path.startswith('/')
            or any(part in ('', '.', '..') for part in harness_path.split('/'))):
        errors.append('repository-relative harness path required')
    if not errors:
        def git(*args):
            return subprocess.run(['git', '--no-replace-objects', '--literal-pathspecs', '-C', str(repo), *args],
                                  capture_output=True, check=True, timeout=10).stdout
        try:
            if git('cat-file', '-t', firmware_sha).strip() != b'commit':
                raise ValueError('firmware pin must resolve to a commit')
            rows = git('ls-tree', '-z', firmware_sha, '--', harness_path).split(b'\0')
            rows = [r for r in rows if r]
            if len(rows) != 1:
                raise ValueError('harness missing or ambiguous at firmware commit')
            meta, path = rows[0].split(b'\t', 1)
            mode, kind, object_id = meta.decode('ascii').split(' ')
            if mode not in ('100644', '100755') or kind != 'blob' or path.decode('utf-8') != harness_path:
                raise ValueError('regular exact-path harness blob required')
            resolved = object_id
            if resolved != blob:
                raise ValueError('harness Git blob mismatch')
        except (OSError, subprocess.SubprocessError, ValueError, UnicodeError):
            errors.append('harness provenance could not be verified at exact firmware commit')
    return {'status': 'FAIL' if errors else 'PASS',
            'scope': 'git-harness-identity-not-coverage-or-derivation-approval',
            'firmwareSourceCommit': firmware_sha, 'harnessPath': harness_path,
            'resolvedBlob': resolved, 'errors': errors}

def compare(native, html, firmware_sha, website_sha, load_pixels, inventory_bytes=None, inventory_sha256=None):
    errors, screens = [], []
    if not isinstance(native, dict):
        errors.append('native manifest invalid'); native = {}
    if not isinstance(html, dict):
        errors.append('html manifest invalid'); html = {}
    if not isinstance(firmware_sha, str) or not SHA.fullmatch(firmware_sha) or not isinstance(website_sha, str) or not SHA.fullmatch(website_sha):
        errors.append('exact firmware and website commit pins required')
    for label, manifest in [('native', native), ('html', html)]:
        if manifest.get('productionSourceCommit') != firmware_sha:
            errors.append(label + ' firmware source mismatch')
        if manifest.get('coverageComplete') is not True or manifest.get('notRun') != []:
            errors.append(label + ' coverage incomplete or NOT_RUN')
    if html.get('websiteSourceCommit') != website_sha or html.get('browserCapture') is not True:
        errors.append('exact-source browser capture required')
    def inventory(manifest, label):
        rows = manifest.get('screens')
        if not isinstance(rows, list) or not rows:
            errors.append(label + ' screen inventory missing')
            return {}
        result = {}
        for row in rows:
            if not isinstance(row, dict) or not isinstance(row.get('id'), str) or not row['id'] or row['id'] in result:
                errors.append(label + ' invalid or duplicate screen ID')
                continue
            result[row['id']] = row
            if (row.get('width'), row.get('height')) != (240, 240) or not isinstance(row.get('sha256'), str) or not HASH.fullmatch(row['sha256']):
                errors.append(label + ' invalid dimensions or file digest: ' + row['id'])
        return result
    expected = {}
    if not isinstance(inventory_bytes, bytes) or not isinstance(inventory_sha256, str) or not HASH.fullmatch(inventory_sha256):
        errors.append('separate source-pinned expected inventory required')
    elif len(inventory_bytes) > 2 * 1024 * 1024 or hashlib.sha256(inventory_bytes).hexdigest() != inventory_sha256:
        errors.append('expected inventory digest or size mismatch')
    else:
        try:
            expected = json.loads(inventory_bytes)
        except (ValueError, UnicodeError):
            errors.append('expected inventory JSON invalid')
    if not isinstance(expected, dict):
        errors.append('expected inventory invalid'); expected = {}
    if expected.get('schema') != 'dnbox-firmware-screen-inventory/1' or expected.get('productionSourceCommit') != firmware_sha:
        errors.append('expected inventory schema/source mismatch')
    if expected.get('coverageComplete') is not True or expected.get('notRun') != []:
        errors.append('expected inventory incomplete or NOT_RUN')
    if not isinstance(expected.get('sourceInventoryGitBlob'), str) or not SHA.fullmatch(expected['sourceInventoryGitBlob']):
        errors.append('source-derived inventory artifact pin required')
    ids = expected.get('screenIds')
    if not isinstance(ids, list) or not ids or any(not isinstance(x, str) or not x for x in ids) or len(set(ids)) != len(ids):
        errors.append('expected screen IDs invalid'); ids = []
    left, right = inventory(native, 'native'), inventory(html, 'html')
    if set(left) != set(right):
        errors.append('screen inventories differ')
    if set(left) != set(ids) or set(right) != set(ids):
        errors.append('capture inventories do not cover authoritative expected IDs')
    # Do not read paths or compare pixels when source/coverage admission fails.
    if not errors:
        for key in sorted(left):
            try:
                a, b = load_pixels('native', left[key]), load_pixels('html', right[key])
                if len(a) != 240 * 240 * 4 or len(b) != len(a):
                    raise ValueError('decoded RGBA dimensions differ')
                changed = sum(a[i:i+4] != b[i:i+4] for i in range(0, len(a), 4))
                screens.append({'id': key, 'differentPixels': changed,
                                'nativeRGBASHA256': hashlib.sha256(a).hexdigest(),
                                'htmlRGBASHA256': hashlib.sha256(b).hexdigest()})
                if changed:
                    errors.append('pixel mismatch: ' + key)
            except (OSError, ValueError, Image.DecompressionBombError) as error:
                errors.append(key + ': ' + str(error))
    return {'status': 'PASS' if not errors else 'FAIL',
            'scope': 'strict-pixel-and-inventory-comparison-not-independent-review',
            'firmwareSourceCommit': firmware_sha, 'websiteSourceCommit': website_sha,
            'expectedInventorySHA256': inventory_sha256, 'expectedScreenCount': len(ids),
            'allowedDifferentPixels': 0, 'screens': screens, 'errors': errors}

def file_loader(roots):
    def load(kind, row):
        root = Path(roots[kind]).resolve()
        name = row.get('path', '')
        if not isinstance(name, str) or '\\' in name:
            raise ValueError('invalid screenshot path')
        relative = Path(name)
        if not name or relative.is_absolute() or '..' in relative.parts or relative.suffix.lower() != '.png':
            raise ValueError('invalid screenshot path')
        path = root
        for part in relative.parts:
            path = path / part
            if path.is_symlink():
                raise ValueError('screenshot symlink refused')
        if not path.is_file() or path.stat().st_size > 2 * 1024 * 1024:
            raise ValueError('regular bounded PNG required')
        data = path.read_bytes()
        if hashlib.sha256(data).hexdigest() != row['sha256']:
            raise ValueError('screenshot file hash mismatch')
        with Image.open(io.BytesIO(data)) as image:
            if image.format != 'PNG' or image.size != (240, 240):
                raise ValueError('exact 240x240 PNG required')
            return image.convert('RGBA').tobytes()
    return load

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--native', required=True, type=Path)
    parser.add_argument('--html', required=True, type=Path)
    parser.add_argument('--inventory', required=True, type=Path)
    parser.add_argument('--inventory-sha256', required=True)
    parser.add_argument('--firmware-repo', required=True, type=Path)
    parser.add_argument('--source-inventory-path', required=True)
    parser.add_argument('--firmware-sha', required=True)
    parser.add_argument('--website-sha', required=True)
    args = parser.parse_args()
    inventory_bytes = args.inventory.read_bytes()
    provenance = verify_inventory_provenance(args.firmware_repo, json.loads(inventory_bytes),
                                             args.firmware_sha, args.source_inventory_path)
    if provenance['status'] != 'PASS':
        # Do not open capture manifests/images before Git identity admission.
        report = {'status': 'FAIL', 'scope': 'strict-pixel-and-inventory-comparison-not-independent-review',
                  'provenance': provenance, 'screens': [], 'errors': provenance['errors']}
    else:
        report = compare(json.loads(args.native.read_text()), json.loads(args.html.read_text()),
                         args.firmware_sha, args.website_sha,
                         file_loader({'native': args.native.parent, 'html': args.html.parent}),
                         inventory_bytes, args.inventory_sha256)
        report['provenance'] = provenance
    print(json.dumps(report, indent=2))
    raise SystemExit(0 if report['status'] == 'PASS' else 1)
