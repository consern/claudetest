import type { ModelProvider } from '../../providers/base.js';
import { codeExplorerPrompt } from '../prompts/codeExplorer.js';
import { callSubagent, type SubagentResult } from './shared.js';

export async function codeExplorerTask(input: {
  provider: ModelProvider;
  model: string;
  task: string;
}): Promise<SubagentResult> {
  return callSubagent({
    role: 'code-explorer',
    provider: input.provider,
    model: input.model,
    prompt: codeExplorerPrompt,
    task: input.task
  });
}

