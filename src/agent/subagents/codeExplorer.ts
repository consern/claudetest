import type { ModelProvider } from '../../providers/base.js';
import { codeExplorerPrompt } from '../prompts/codeExplorer.js';
import { callSubagent, type ExplorerResult } from './shared.js';

const explorerContract = `{
  "summary": "string",
  "findings": ["string"],
  "entryPoints": ["string"],
  "relevantPaths": ["string"],
  "suggestedFiles": ["string"],
  "risks": ["string"],
  "confidence": 0.0
}`;

export async function codeExplorerTask(input: {
  provider: ModelProvider;
  model: string;
  task: string;
}): Promise<ExplorerResult> {
  return callSubagent({
    role: 'code-explorer',
    provider: input.provider,
    model: input.model,
    prompt: codeExplorerPrompt,
    task: input.task,
    outputContract: explorerContract
  }) as Promise<ExplorerResult>;
}

