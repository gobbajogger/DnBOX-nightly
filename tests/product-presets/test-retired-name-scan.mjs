import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('tracked current sources have no retired engine name', () => {
  const name = String.fromCharCode(100, 114, 111, 110, 101);
  // The owner policy specifies the replacement, and the archived gate receipts quote that policy.
  const result = spawnSync('git', ['grep', '-niwI', name, '--', '.',
    ':!RULES.md', ':!*CHANGELOG*', ':!docs/history/**', ':!docs/scheduler-handoffs/**',
    ':!evidence/integ-resume/qualification-0130/consolidated-failure-ledger.json',
    ':!evidence/integ-resume/qualification-0130/nightly-consolidated-terminal-receipt.json'], { encoding: 'utf8' });
  assert.equal(result.status, 1, result.stdout || result.stderr);
});
