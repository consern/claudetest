import type { ModelProvider } from '../../providers/base.js';
import { codeArchitectPrompt } from '../prompts/codeArchitect.js';
import { callSubagent, type ArchitectResult } from './shared.js';

const architectContract = `{
  "summary": "string",
  "recommendedApproach": "string",
  "filesToModify": ["string"],
  "filesToCreate": ["string"],
  "implementationSteps": ["string"],
  "tradeoffs": ["string"],
  "confidence": 0.0
}`;

export async function codeArchitectTask(input: {
  provider: ModelProvider;
  model: string;
  task: string;
}): Promise<ArchitectResult> {
  return callSubagent({
    role: 'code-architect',
    provider: input.provider,
    model: input.model,
    prompt: codeArchitectPrompt,
    task: input.task,
    outputContract: architectContract
  }) as Promise<ArchitectResult>;
}

