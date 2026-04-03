import { riskyCodePatterns, riskyPathPatterns } from './securityRules.js';

export interface PreToolUseInput {
  filePath: string;
  newContent: string;
}

export interface PreToolUseResult {
  ok: boolean;
  reason: string;
}

export function runPreToolUseChecks(input: PreToolUseInput): PreToolUseResult {
  if (riskyPathPatterns.some((p) => p.test(input.filePath))) {
    return {
      ok: false,
      reason: `命中高风险路径: ${input.filePath}`
    };
  }

  for (const pattern of riskyCodePatterns) {
    if (pattern.test(input.newContent)) {
      return {
        ok: false,
        reason: `命中高风险代码模式: ${pattern}`
      };
    }
  }

  return { ok: true, reason: '' };
}

