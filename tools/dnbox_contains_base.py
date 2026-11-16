#!/usr/bin/env python3
"""Exact containment proof; missing unrelated donor history cannot fake a PASS."""
import hashlib
import json
import re
import subprocess
import sys

SHA = re.compile(r'[0-9a-f]{40}')

def first_parent_witness(base, head):
    if not SHA.fullmatch(base) or not SHA.fullmatch(head):
        raise ValueError('expected exact commit IDs')
    path = []
    current = head
    while current not in path and len(path) < 10000:
        raw = subprocess.check_output(['git', 'cat-file', 'commit', current], stderr=subprocess.DEVNULL)
        actual = hashlib.sha1(b'commit ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
        if actual != current:
            raise ValueError('commit object identity mismatch')
        path.append(current)
        if current == base:
            return path
        header = raw.split(b'\n\n', 1)[0]
        parents = [line[7:].decode('ascii') for line in header.splitlines() if line.startswith(b'parent ')]
        if not parents or any(not SHA.fullmatch(p) for p in parents):
            raise ValueError('base not proven on exact first-parent chain')
        current = parents[0]
    raise ValueError('base not proven within finite acyclic first-parent chain')


def main():
    if len(sys.argv) != 2 or not SHA.fullmatch(sys.argv[1]):
        print('FAIL: exact base SHA required'); return 1
    base = sys.argv[1]
    try:
        head = subprocess.check_output(['git', 'rev-parse', '--verify', 'HEAD'], text=True).strip()
        result = subprocess.run(['git', 'merge-base', '--is-ancestor', base, head], capture_output=True)
        if result.returncode == 0:
            print(json.dumps({'containment': 'PASS', 'method': 'git-merge-base', 'base': base, 'head': head})); return 0
        path = first_parent_witness(base, head)
        print(json.dumps({'containment': 'PASS', 'method': 'hash-verified-first-parent-witness', 'base': base, 'head': head, 'path': path})); return 0
    except (ValueError, UnicodeError, subprocess.CalledProcessError) as error:
        print('FAIL: containment not proven: ' + str(error)); return 1


if __name__ == '__main__':
    raise SystemExit(main())
