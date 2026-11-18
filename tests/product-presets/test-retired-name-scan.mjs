import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const name = String.fromCharCode(100, 114, 111, 110, 101);
// Byte-exact GPL qualification inputs at ffd31a735acc5721d1f90a30fc1ceb283aad6fc5,
// not current engine labels. Exceptions cover these two originals only: newly
// added siblings and modified copies must not inherit a directory-wide bypass.
const historicalInputs = new Map([
  ['tools/master-source/firmware/src/app/engine.c', '67c77e856e761f29f646c9f5842d99db87c284c8a0a38fc2ade128ebab27f580'],
  ['tools/master-source/firmware/src/app/ui.c', 'd7f9db8ec08f62ae65a6a6d6e9a25f26aaf7069143a8b4b54a78d7d6f6d6526a'],
]);

function scan(cwd) {
  for (const [path, sha256] of historicalInputs) {
    const bytes = readFileSync(join(cwd, path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), sha256,
      `Pinned historical input bytes changed: ${path}`);
  }
  return spawnSync('git', ['grep', '-niwI', name, '--', '.',
    ':!*CHANGELOG*', ':!docs/history/**', ':!docs/scheduler-handoffs/**',
    ...[...historicalInputs.keys()].map(path => `:!${path}`)], { cwd, encoding: 'utf8' });
}

function trackedFixture(files, run) {
  const cwd = mkdtempSync(join(tmpdir(), 'retired-name-boundary-'));
  try {
    const init = spawnSync('git', ['init', '--quiet', cwd], { encoding: 'utf8' });
    assert.equal(init.status, 0, init.stderr);
    for (const path of historicalInputs.keys()) {
      mkdirSync(dirname(join(cwd, path)), { recursive: true });
      writeFileSync(join(cwd, path), readFileSync(join(root, path)));
    }
    for (const [path, bytes] of Object.entries(files)) {
      mkdirSync(dirname(join(cwd, path)), { recursive: true });
      writeFileSync(join(cwd, path), bytes);
    }
    // The production scanner intentionally covers tracked files. No commit or
    // changes to this repository's index are needed for these temporary controls.
    const add = spawnSync('git', ['add', '-f', '--', '.'], { cwd, encoding: 'utf8' });
    assert.equal(add.status, 0, add.stderr);
    run(cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

test('tracked current sources have no retired engine name', () => {
  const result = scan(root);
  assert.equal(result.status, 1, result.stdout || result.stderr);
});

test('exact historical inputs alone do not fail the current-source scan', () => {
  trackedFixture({ 'web/current-engine.mjs': 'Synth One\n' }, cwd => {
    const result = scan(cwd);
    assert.equal(result.status, 1, result.stdout || result.stderr);
  });
});

for (const path of [
  'firmware/src/app/current-engine.c',
  'web/product-site/remote/current-engine.mjs',
  'tests/product-presets/current-engine.mjs',
  'tools/master-source/firmware/src/app/current-engine.c',
]) {
  test(`current-source detection still rejects ${path}`, () => {
    trackedFixture({ [path]: name.toUpperCase() + '\n' }, cwd => {
      const result = scan(cwd);
      assert.equal(result.status, 0, result.stderr);
      assert.ok(result.stdout.includes(path + ':1:'), result.stdout);
    });
  });
}

test('a changed historical input fails its pinned identity instead of bypassing detection', () => {
  trackedFixture({}, cwd => {
    const path = [...historicalInputs.keys()][0];
    writeFileSync(join(cwd, path), readFileSync(join(cwd, path), 'utf8') + '\n// changed\n');
    assert.throws(() => scan(cwd), /Pinned historical input bytes changed/);
  });
});
