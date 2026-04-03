import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runAgentLoop } from '../src/agent/loop.js';
import type { ModelProvider } from '../src/providers/base.js';
import type { ToolContext } from '../src/tools/types.js';

test('loop telemetry updates across rounds', async () => {
  const root = await mkdtemp(join(tmpdir(), 'claudetest-telemetry-'));
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
      return { text: 'done', stopReason: 'final' };
    }
  };

  const ctx: ToolContext = {
    approval: { requestApproval: async () => true },
    workspaceRoot: root,
    readMaxBytes: 10000,
    shellEnabled: true,
    writeEnabled: true
  };

  const telemetry: Array<string> = [];

  await runAgentLoop({
    userText: 'find needle',
    history: [],
    provider,
    model: 'mock',
    toolContext: ctx,
    cwd: root,
    maxIterations: 4,
    onTelemetry: (t) => telemetry.push(`${t.round}:${t.activeMode}:${t.activeTool ?? ''}`)
  });

  assert.ok(telemetry.some((x) => x.startsWith('1:normal')));
  assert.ok(telemetry.some((x) => x.includes('tool_call: search_files')));
});
