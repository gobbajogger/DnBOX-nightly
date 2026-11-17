import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('tracked current sources have no retired engine name', () => {
  const name = String.fromCharCode(100, 114, 111, 110, 101);
  const result = spawnSync('git', ['grep', '-niwI', name, '--', '.',
    ':!*CHANGELOG*', ':!docs/history/**', ':!docs/scheduler-handoffs/**'], { encoding: 'utf8' });
  assert.equal(result.status, 1, result.stdout || result.stderr);
});
