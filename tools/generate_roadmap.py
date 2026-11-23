#!/usr/bin/env python3
"""Generate the three roadmap views from the integration owner's state block."""
import argparse
import json
import re
import os
import subprocess
from pathlib import Path

FIELDS = {'id', 'title', 'move', 'status', 'merge_sha', 'owner', 'dependencies', 'next_action'}

def read_items(text):
    blocks = re.findall(r'```json\s*\n(.*?)\n```', text, re.S)
    states = [json.loads(block) for block in blocks if '"items"' in block]
    if len(states) != 1 or not isinstance(states[0].get('items'), list):
        raise ValueError('Exactly one JSON state block with items is required')
    items = states[0]['items']
    seen = set()
    for item in items:
        if not isinstance(item, dict) or set(item) != FIELDS:
            raise ValueError('Invalid roadmap item fields')
        if any(not isinstance(item[k], str) for k in FIELDS - {'dependencies'}):
            raise ValueError('Item fields must be strings')
        if not item['id'] or item['id'] in seen:
            raise ValueError('Empty or duplicate item id')
        seen.add(item['id'])
        if item['status'] not in {'pending', 'working', 'blocked', 'merged'}:
            raise ValueError('Unknown item status')
        if not isinstance(item['dependencies'], list) or any(not isinstance(d, str) for d in item['dependencies']):
            raise ValueError('Invalid dependencies')
        if item['status'] == 'merged' and not re.fullmatch('[0-9a-f]{40}', item['merge_sha']):
            raise ValueError('Merged item requires an integration-verified merge SHA')
        if item['status'] != 'merged' and item['merge_sha']:
            raise ValueError('Unmerged item cannot have a merge SHA')
    return items

def escaped(value):
    return str(value).replace('|', '\\|').replace('\n', ' ').replace('\r', ' ')

def verify_merges(items, root, integration_sha):
    """Verify exact caller-supplied integration snapshot using local Git only."""
    if not re.fullmatch(r'[0-9a-f]{40}', integration_sha or ''):
        raise ValueError('A full API-verified integration SHA is required')
    env = dict(os.environ, GIT_NO_REPLACE_OBJECTS='1')
    def git(*args):
        return subprocess.run(['git', '-C', str(root), *args], env=env,
                              capture_output=True, text=True)
    if git('cat-file', '-t', integration_sha).stdout.strip() != 'commit':
        raise ValueError('Integration commit unavailable locally')
    for item in items:
        if item['status'] != 'merged':
            continue
        sha = item['merge_sha']
        if git('cat-file', '-t', sha).stdout.strip() != 'commit':
            raise ValueError('Missing merge commit: ' + sha)
        if git('merge-base', '--is-ancestor', sha, integration_sha).returncode != 0:
            raise ValueError('Unintegrated merge commit: ' + sha)

def render(items):
    outputs = {}
    for name, statuses in [('Complete', {'merged'}), ('Working', {'working', 'blocked'}), ('Pending', {'pending'})]:
        lines = [f'# {name}', '', 'Generated from `CONSOLIDATED-STATE.md` by `tools/generate_roadmap.py`. Do not edit.', '',
                 '| Item | Move | Status | Owner | Merge | Dependencies | Next action |',
                 '|---|---|---|---|---|---|---|']
        for item in items:
            if item['status'] in statuses:
                row = [item['id'] + ': ' + item['title'], item['move'], item['status'], item['owner'], item['merge_sha'], ', '.join(item['dependencies']), item['next_action']]
                lines.append('| ' + ' | '.join(map(escaped, row)) + ' |')
        outputs[name + '.md'] = '\n'.join(lines) + '\n'
    return outputs

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--integration-sha', default=os.environ.get('DNBOX_GATE_BASE_SHA'))
    args = parser.parse_args()
    items = read_items((args.root / 'CONSOLIDATED-STATE.md').read_text())
    verify_merges(items, args.root, args.integration_sha)
    outputs = render(items)
    target = args.root / 'docs/roadmap'
    if not args.check:
        target.mkdir(parents=True, exist_ok=True)
    for name, content in outputs.items():
        path = target / name
        if args.check:
            if not path.is_file() or path.read_text() != content:
                raise SystemExit(f'Stale roadmap: {path}')
        else:
            path.write_text(content)

if __name__ == '__main__':
    main()
