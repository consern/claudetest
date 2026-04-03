import type { ModelProvider } from '../../providers/base.js';
import { codeReviewerPrompt } from '../prompts/codeReviewer.js';
import { callSubagent, type ReviewerResult } from './shared.js';

const reviewerContract = `{
  "summary": "string",
  "findings": [
    {
      "title": "string",
      "whyItMatters": "string",
      "evidence": "string",
      "confidence": 0.0,
      "category": "bug|security|guideline|performance"
    }
  ],
  "confidence": 0.0
}`;

export async function codeReviewerTask(input: {
  provider: ModelProvider;
  model: string;
  task: string;
}): Promise<ReviewerResult> {
  return callSubagent({
    role: 'code-reviewer',
    provider: input.provider,
    model: input.model,
    prompt: codeReviewerPrompt,
    task: input.task,
    outputContract: reviewerContract
  }) as Promise<ReviewerResult>;
}

