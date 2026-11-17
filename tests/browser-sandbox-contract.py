#!/usr/bin/env python3
"""Static contract for gate-reachable browser launches. Never starts a browser."""
import ast
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def reachable(root):
    scripts = json.loads((root / 'package.json').read_text())['scripts']
    pending = ['test', 'test:browser']
    seen, files = set(), set()
    while pending:
        name = pending.pop()
        if name in seen:
            continue
        seen.add(name)
        command = scripts[name]
        pending.extend(re.findall(r'\bnpm run ([\w:-]+)', command))
        files.update(re.findall(r'\bpython3\s+([\w/.-]+\.py)', command))
    files.update(re.findall(r'\bpython3\s+([\w/.-]+\.py)', (root / 'scripts/dnbox-gate.sh').read_text()))
    return sorted(files)


def inspect(source, path):
    errors, count = [], 0
    for node in ast.walk(ast.parse(source, filename=path)):
        if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
            continue
        if node.func.attr not in ('launch', 'launch_persistent_context'):
            continue
        count += 1
        options = {kw.arg: kw.value for kw in node.keywords}
        value = options.get('chromium_sandbox')
        if not isinstance(value, ast.Constant) or value.value is not True:
            errors.append(f'{path}:{node.lineno}: explicit chromium_sandbox=True required')
        if any(kw.arg is None for kw in node.keywords):
            errors.append(f'{path}:{node.lineno}: dynamic launch options require audit')
        args = options.get('args')
        if args is not None:
            try:
                values = ast.literal_eval(args)
                if not isinstance(values, (list, tuple)) or not all(isinstance(v, str) for v in values):
                    raise ValueError()
                if any(v.startswith(('--no-sandbox', '--disable-setuid-sandbox', '--disable-namespace-sandbox', '--disable-seccomp-filter-sandbox', '--single-process')) for v in values):
                    errors.append(f'{path}:{node.lineno}: sandbox-disabling argument')
            except (ValueError, TypeError):
                errors.append(f'{path}:{node.lineno}: dynamic arguments require audit')
        if 'executable_path' in options or 'channel' in options:
            errors.append(f'{path}:{node.lineno}: only bundled Playwright Chromium is allowed')
        if 'ignore_default_args' in options:
            errors.append(f'{path}:{node.lineno}: default argument override requires audit')
    return errors, count


def check(root):
    errors, count = [], 0
    for path in reachable(root):
        found, launches = inspect((root / path).read_text(), path)
        errors.extend(found)
        count += launches
    if not count:
        errors.append('no browser launch sites reached')
    return errors, count


def controls():
    good = 'p.chromium.launch(chromium_sandbox=True, args=["--force-color-profile=srgb"])'
    assert inspect(good, 'positive')[0] == []
    bad = [
        'p.chromium.launch()',
        'p.chromium.launch(chromium_sandbox=True, executable_path="/usr/bin/chromium")',
        'p.chromium.launch(chromium_sandbox=True, channel="chrome")',
        'p.chromium.launch(chromium_sandbox=False)',
        'p.chromium.launch(chromium_sandbox=True, args=["--no-sandbox"])',
        'p.chromium.launch(chromium_sandbox=True, args=["--disable-setuid-sandbox"])',
        'p.chromium.launch_persistent_context("/tmp/profile")',
        'p.chromium.launch(chromium_sandbox=True, **options)',
        'p.chromium.launch(chromium_sandbox=True, args=options)',
        'p.chromium.launch(chromium_sandbox=True, ignore_default_args=True)',
    ]
    for source in bad:
        assert inspect(source, 'negative')[0], source
    return len(bad)


if __name__ == '__main__':
    negative = controls()
    errors, count = check(ROOT)
    for error in errors:
        print('FAIL ' + error)
    print(f'browser sandbox contract: launches={count} negative_controls={negative} findings={len(errors)}')
    sys.exit(bool(errors))
