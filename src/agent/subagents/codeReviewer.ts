import type { ModelProvider } from '../../providers/base.js';
import { codeReviewerPrompt } from '../prompts/codeReviewer.js';
import { callSubagent, type SubagentResult } from './shared.js';

export async function codeReviewerTask(input: {
  provider: ModelProvider;
  model: string;
  task: string;
}): Promise<SubagentResult> {
  return callSubagent({
    role: 'code-reviewer',
    provider: input.provider,
    model: input.model,
    prompt: codeReviewerPrompt,
    task: input.task
  });
}

