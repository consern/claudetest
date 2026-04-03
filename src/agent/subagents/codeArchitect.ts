import type { ModelProvider } from '../../providers/base.js';
import { codeArchitectPrompt } from '../prompts/codeArchitect.js';
import { callSubagent, type SubagentResult } from './shared.js';

export async function codeArchitectTask(input: {
  provider: ModelProvider;
  model: string;
  task: string;
}): Promise<SubagentResult> {
  return callSubagent({
    role: 'code-architect',
    provider: input.provider,
    model: input.model,
    prompt: codeArchitectPrompt,
    task: input.task
  });
}

