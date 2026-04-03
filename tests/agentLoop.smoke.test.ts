import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runAgentLoop } from '../src/agent/loop.js';
import type { ModelProvider } from '../src/providers/base.js';
import type { ToolContext } from '../src/tools/types.js';

test('agent loop handles tool call then final answer', async () => {
  const root = await mkdtemp(join(tmpdir(), 'claudetest-loop-'));
  await writeFile(join(root, 'x.txt'), 'needle', 'utf8');

  let callCount = 0;
  const provider: ModelProvider = {
    name: 'mock',
    async createResponse() {
      callCount += 1;
      if (callCount === 1) {
        return {
          text: '',
          toolCalls: [{ id: 'c1', name: 'search_files', args: { query: 'needle' } }],
          stopReason: 'tool_calls'
        };
      }
      return { text: 'final answer', stopReason: 'final' };
    }
  };

  const ctx: ToolContext = {
    approval: { requestApproval: async () => true },
    workspaceRoot: root,
    readMaxBytes: 10000,
    shellEnabled: true,
    writeEnabled: true
  };

  const out = await runAgentLoop({
    userText: 'find needle',
    history: [],
    provider,
    model: 'mock',
    toolContext: ctx,
    cwd: root,
    maxIterations: 4
  });

  assert.equal(out.text, 'final answer');
  assert.ok(out.toolEvents.some((e) => e.includes('tool_call: search_files')));
});
