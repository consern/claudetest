import test from 'node:test';
import assert from 'node:assert/strict';
import { applyReviewerPrecisionGate } from '../src/agent/subagents/shared.js';

test('reviewer precision gate filters weak findings', () => {
  const out = applyReviewerPrecisionGate([
    {
      title: 'weak',
      whyItMatters: 'x',
      evidence: 'e',
      confidence: 0.4,
      category: 'bug'
    },
    {
      title: 'strong',
      whyItMatters: 'x',
      evidence: 'e',
      confidence: 0.85,
      category: 'bug'
    },
    {
      title: 'security-mid',
      whyItMatters: 'x',
      evidence: 'e',
      confidence: 0.76,
      category: 'security'
    }
  ]);

  assert.equal(out.length, 2);
  assert.ok(out.some((x) => x.title === 'strong'));
  assert.ok(out.some((x) => x.title === 'security-mid'));
});
