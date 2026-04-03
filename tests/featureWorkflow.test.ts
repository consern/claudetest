import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runFeatureDevWorkflow } from '../src/agent/workflow.js';
import type { ModelProvider } from '../src/providers/base.js';
import type { ToolContext } from '../src/tools/types.js';

test('feature workflow blocks implementation when approval denied', async () => {
  const root = await mkdtemp(join(tmpdir(), 'claudetest-workflow-'));
  await writeFile(join(root, 'src.txt'), 'content', 'utf8');

  const provider: ModelProvider = {
    name: 'mock',
    async createResponse(input) {
      const prompt = input.systemPrompt ?? '';
      if (prompt.includes('code-explorer')) {
        return {
          text: JSON.stringify({
            summary: 'explored',
            findings: ['entry found'],
            entryPoints: ['src/cli/app.tsx'],
            relevantPaths: ['src/agent/loop.ts'],
            suggestedFiles: ['src/agent/loop.ts'],
            risks: [],
            confidence: 0.8
          }),
          stopReason: 'final'
        };
      }
      if (prompt.includes('code-architect')) {
        return {
          text: JSON.stringify({
            summary: 'plan',
            recommendedApproach: 'modify loop',
            filesToModify: ['src/agent/loop.ts'],
            filesToCreate: [],
            implementationSteps: ['step1'],
            tradeoffs: ['tradeoff1'],
            confidence: 0.7
          }),
          stopReason: 'final'
        };
      }
      return {
        text: JSON.stringify({
          summary: 'review done',
          findings: [
            {
              title: 'sample',
              whyItMatters: 'important',
              evidence: 'evidence',
              confidence: 0.9,
              category: 'bug'
            }
          ],
          confidence: 0.9
        }),
        stopReason: 'final'
      };
    }
  };

  const ctx: ToolContext = {
    approval: { requestApproval: async () => false },
    workspaceRoot: root,
    readMaxBytes: 10000,
    shellEnabled: true,
    writeEnabled: true
  };

  const out = await runFeatureDevWorkflow({
    task: '/feature test',
    provider,
    model: 'mock',
    toolContext: ctx
  });

  assert.equal(out.state.approvalGranted, false);
  assert.equal(out.phaseHistory.includes('implementation'), false);
});
