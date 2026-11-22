# SPDX-License-Identifier: GPL-3.0-only
"""Compare images at their native size and retain auditable, unlabeled pixel metrics."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
# The current repo’s normalized maximum channel tolerance is 0.1.
# Keep that tolerance and report the exact RGB count independently as well.
PIXEL_THRESHOLD = 25.5


def compare(reference, actual, output):
    with Image.open(reference) as original, Image.open(actual) as capture:
        left, right = original.convert('RGB'), capture.convert('RGB')
    assert left.size == right.size, (reference.name, left.size, actual.name, right.size)
    a, b = np.asarray(left, dtype=np.int16), np.asarray(right, dtype=np.int16)
    amplitude = np.max(np.abs(a-b), axis=2)
    total = amplitude.size
    exact = int(np.count_nonzero(amplitude))
    threshold = int(np.count_nonzero(amplitude > PIXEL_THRESHOLD))
    pair = Image.new('RGB', (left.width + right.width, left.height))
    pair.paste(left, (0, 0))
    pair.paste(right, (left.width, 0))
    pair.save(output)
    return {
        'nativeSize': left.size, 'totalPixels': total, 'exactDifferentPixels': exact,
        'tolerantDifferentPixels': threshold, 'tolerantDifferentPercent': round(100*threshold/total, 4),
        'atMostTwoPercentByTolerantMetric': threshold/total <= .02,
        'referenceSha256': hashlib.sha256(reference.read_bytes()).hexdigest(),
        'captureSha256': hashlib.sha256(actual.read_bytes()).hexdigest(),
        'pairSha256': hashlib.sha256(output.read_bytes()).hexdigest()
    }


def owner_pairs(pdf_renders, crosswalk, output, replacement=None):
    inventory = json.loads(gzip.decompress((crosswalk/'inventory.json.gz').read_bytes()))
    replacements = json.loads(replacement.read_text()) if replacement else {}
    pairs = {}
    for name, state in inventory['states'].items():
        for number in state['pages']:
            current = replacements.get(name)
            capture = Path(current['path']) if current else crosswalk / f'{name}.png'
            pairs[name] = compare(pdf_renders / f'owner-{number:02}.png', capture, output / f'owner-{name}.png')
            pairs[name]['page'] = number
            if current:
                pairs[name]['captureSource'] = current['commit']
                pairs[name]['captureMethod'] = current['method']
                assert pairs[name]['captureSha256'] == current['sha256'], name
            else:
                assert pairs[name]['captureSha256'] == state['screenshotSHA256'], name
                pairs[name]['documentWidth'] = state['bodyWidth']
                pairs[name]['mountedControls'] = len(state['entries'])
    assert {x['page'] for x in pairs.values()} == set(range(1,24)), pairs.keys()
    assert not inventory['errors'], inventory['errors']
    return {'sourceAppSHA256':inventory['appSHA256'], 'browserVersion':inventory['browser'],
            'referenceType':'owner PDF draft, same native drawing size', 'pairs':pairs}


def proposal_pairs(proposals, registered, output):
    inventory = json.loads((registered / 'inventory.json').read_text())
    pairs = {}
    manifest = json.loads((proposals/'proposal-manifest.json').read_text())
    pinned = {record['filename']:record for record in manifest['images']}
    for name, state in inventory['states'].items():
        reference = proposals / f'{name}-actual.png'
        pin = pinned[reference.name]
        assert reference.stat().st_size == pin['bytes']
        pairs[name] = compare(reference, registered / f'{name}.png', output / f'{name}.png')
        assert pairs[name]['referenceSha256'] == pin['sha256'], name
        assert pairs[name]['captureSha256'] == state['sha256'], name
        pairs[name]['captureMethod'] = state.get('capture')
        if 'body' in state:
            pairs[name]['document'] = state['body']
            pairs[name]['currentState'] = {key:state[key] for key in ('part','view','lane')}
    assert len(pairs) == 32 and not inventory['errors'], inventory
    return {'source':inventory['source'], 'sourceAppSHA256':inventory['productAppSHA256'],
            'referenceType':'unapproved historical Integration proposals',
            'referenceCommit':manifest['commit'], 'pairs':pairs}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('kind', choices=['owner','proposal'])
    parser.add_argument('reference', type=Path)
    parser.add_argument('actual', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--replacement', type=Path, help='Hash-pinned owner-page captures from routed evidence')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    if args.kind == 'owner':
        report = owner_pairs(args.reference, args.actual, args.output, args.replacement)
    else:
        report = proposal_pairs(args.reference, args.actual, args.output)
    (args.output / 'metrics.json').write_text(json.dumps(report, indent=2) + '\n')
    print(report['referenceType'], len(report['pairs']), 'pairs,',
          sum(x['atMostTwoPercentByTolerantMetric'] for x in report['pairs'].values()), 'within 2%')
