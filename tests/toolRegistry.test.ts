import test from 'node:test';
import assert from 'node:assert/strict';
import { executeToolByName } from '../src/tools/toolRegistry.js';
import type { ToolContext } from '../src/tools/types.js';

const ctx: ToolContext = {
  approval: {
    requestApproval: async () => true
  },
  workspaceRoot: 'E:/code/claudetest',
  readMaxBytes: 10000,
  shellEnabled: true,
  writeEnabled: true
};

test('unknown tool fails gracefully', async () => {
  const out = await executeToolByName('not_exists', {}, ctx);
  assert.equal(out.ok, false);
  assert.match(out.summary, /未知工具|unknown/i);
});

test('invalid args fail schema validation', async () => {
  const out = await executeToolByName('read_file', {}, ctx);
  assert.equal(out.ok, false);
  assert.match(out.summary, /validation failed|failed/i);
});
