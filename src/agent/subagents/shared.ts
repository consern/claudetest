import { randomUUID } from 'node:crypto';
import type { ModelProvider } from '../../providers/base.js';
import type { ProviderResponse } from '../../types/provider.js';

export type SubagentRole = 'code-explorer' | 'code-architect' | 'code-reviewer';

export interface SubagentResult {
  role: SubagentRole;
  summary: string;
  findings: string[];
  suggestedFiles?: string[];
  confidence?: number;
}

function tryParseSubagentJson(text: string): Partial<SubagentResult> | null {
  try {
    return JSON.parse(text) as Partial<SubagentResult>;
  } catch {
    return null;
  }
}

function normalizeResult(
  role: SubagentRole,
  response: ProviderResponse
): SubagentResult {
  const parsed = tryParseSubagentJson(response.text);
  if (parsed) {
    return {
      role,
      summary: parsed.summary ?? 'No summary',
      findings: parsed.findings ?? [],
      suggestedFiles: parsed.suggestedFiles ?? [],
      confidence: parsed.confidence ?? 0.6
    };
  }

  return {
    role,
    summary: response.text.slice(0, 500) || 'No content',
    findings: [],
    suggestedFiles: [],
    confidence: 0.4
  };
}

export async function callSubagent(input: {
  role: SubagentRole;
  provider: ModelProvider;
  model: string;
  prompt: string;
  task: string;
}): Promise<SubagentResult> {
  const response = await input.provider.createResponse({
    model: input.model,
    systemPrompt: input.prompt,
    messages: [
      {
        role: 'user',
        content:
          `Task:\n${input.task}\n\n` +
          'Return strict JSON: {"summary": string, "findings": string[], "suggestedFiles": string[], "confidence": number}'
      }
    ]
  });

  const result = normalizeResult(input.role, response);
  result.summary = `${result.summary} [${randomUUID().slice(0, 8)}]`;
  return result;
}

