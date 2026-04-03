import test from 'node:test';
import assert from 'node:assert/strict';
import { callSubagent } from '../src/agent/subagents/shared.js';
import type { ModelProvider } from '../src/providers/base.js';

test('subagent malformed json triggers retry and recovers', async () => {
  let count = 0;
  const provider: ModelProvider = {
    name: 'mock',
    async createResponse() {
      count += 1;
      if (count === 1) {
        return { text: 'not json', stopReason: 'final' };
      }
      return {
        text: JSON.stringify({
          summary: 'ok',
          findings: ['f1'],
          entryPoints: ['a'],
          relevantPaths: ['b'],
          suggestedFiles: ['c'],
          risks: [],
          confidence: 0.8
        }),
        stopReason: 'final'
      };
    }
  };

  const out = await callSubagent({
    role: 'code-explorer',
    provider,
    model: 'mock',
    prompt: 'code-explorer',
    task: 't',
    outputContract: '{}'
  });

  assert.equal(out.role, 'code-explorer');
  assert.equal(out.summary, 'ok');
  assert.equal(count, 2);
});

test('subagent returns degraded result if retry still malformed', async () => {
  const provider: ModelProvider = {
    name: 'mock',
    async createResponse() {
      return { text: 'still broken', stopReason: 'final' };
    }
  };

  const out = await callSubagent({
    role: 'code-architect',
    provider,
    model: 'mock',
    prompt: 'code-architect',
    task: 't',
    outputContract: '{}'
  });

  assert.equal(out.role, 'code-architect');
  assert.equal(out.degraded, true);
  assert.match(out.error ?? '', /Malformed JSON/i);
});
