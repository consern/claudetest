import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePathWithinWorkspace } from '../src/tools/sandbox.js';

test('resolvePathWithinWorkspace allows in-workspace paths', () => {
  const root = 'E:/code/claudetest';
  const p = resolvePathWithinWorkspace('src/agent/loop.ts', root);
  assert.ok(p.toLowerCase().includes('e:\\code\\claudetest'.toLowerCase()));
});

test('resolvePathWithinWorkspace rejects traversal', () => {
  const root = 'E:/code/claudetest';
  assert.throws(() => resolvePathWithinWorkspace('../outside.txt', root));
});
