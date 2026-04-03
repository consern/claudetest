import type { ModelProvider } from '../../providers/base.js';
import type { ProviderResponse } from '../../types/provider.js';
import type {
  ArchitecturePlan,
  ReviewFinding,
  ReviewCategory
} from '../../types/workflow.js';

export type SubagentRole = 'code-explorer' | 'code-architect' | 'code-reviewer';

export interface ExplorerResult {
  role: 'code-explorer';
  summary: string;
  findings: string[];
  entryPoints: string[];
  relevantPaths: string[];
  suggestedFiles: string[];
  risks: string[];
  confidence: number;
}

export interface ArchitectResult {
  role: 'code-architect';
  summary: string;
  recommendedApproach: string;
  filesToModify: string[];
  filesToCreate: string[];
  implementationSteps: string[];
  tradeoffs: string[];
  confidence: number;
}

export interface ReviewerResult {
  role: 'code-reviewer';
  summary: string;
  findings: ReviewFinding[];
  confidence: number;
}

export type SubagentResult = ExplorerResult | ArchitectResult | ReviewerResult;

function parseJson(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((v): v is string => typeof v === 'string');
}

function toConfidence(value: unknown, fallback: number): number {
  return typeof value === 'number' && value >= 0 && value <= 1 ? value : fallback;
}

function normalizeCategory(value: unknown): ReviewCategory {
  if (
    value === 'bug' ||
    value === 'security' ||
    value === 'guideline' ||
    value === 'performance'
  ) {
    return value;
  }
  return 'guideline';
}

function normalizeReviewFindings(value: unknown): ReviewFinding[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const row = item as Record<string, unknown>;
      return {
        title: typeof row.title === 'string' ? row.title : 'Untitled finding',
        whyItMatters:
          typeof row.whyItMatters === 'string' ? row.whyItMatters : 'No explanation provided.',
        evidence: typeof row.evidence === 'string' ? row.evidence : 'No evidence provided.',
        confidence: toConfidence(row.confidence, 0.55),
        category: normalizeCategory(row.category)
      } satisfies ReviewFinding;
    })
    .filter((f): f is ReviewFinding => Boolean(f));
}

function normalizeExplorer(
  response: ProviderResponse,
  fallbackTask: string
): ExplorerResult {
  const parsed = parseJson(response.text);
  if (!parsed) {
    return {
      role: 'code-explorer',
      summary: response.text.slice(0, 400) || `Explorer fallback for: ${fallbackTask}`,
      findings: [],
      entryPoints: [],
      relevantPaths: [],
      suggestedFiles: [],
      risks: [],
      confidence: 0.45
    };
  }

  return {
    role: 'code-explorer',
    summary: typeof parsed.summary === 'string' ? parsed.summary : 'Explorer summary unavailable.',
    findings: toStringArray(parsed.findings),
    entryPoints: toStringArray(parsed.entryPoints),
    relevantPaths: toStringArray(parsed.relevantPaths),
    suggestedFiles: toStringArray(parsed.suggestedFiles),
    risks: toStringArray(parsed.risks),
    confidence: toConfidence(parsed.confidence, 0.65)
  };
}

function normalizeArchitect(
  response: ProviderResponse,
  fallbackTask: string
): ArchitectResult {
  const parsed = parseJson(response.text);
  if (!parsed) {
    return {
      role: 'code-architect',
      summary: response.text.slice(0, 400) || `Architect fallback for: ${fallbackTask}`,
      recommendedApproach: 'No recommended approach provided.',
      filesToModify: [],
      filesToCreate: [],
      implementationSteps: [],
      tradeoffs: [],
      confidence: 0.45
    };
  }

  return {
    role: 'code-architect',
    summary: typeof parsed.summary === 'string' ? parsed.summary : 'Architect summary unavailable.',
    recommendedApproach:
      typeof parsed.recommendedApproach === 'string'
        ? parsed.recommendedApproach
        : 'No recommended approach provided.',
    filesToModify: toStringArray(parsed.filesToModify),
    filesToCreate: toStringArray(parsed.filesToCreate),
    implementationSteps: toStringArray(parsed.implementationSteps),
    tradeoffs: toStringArray(parsed.tradeoffs),
    confidence: toConfidence(parsed.confidence, 0.62)
  };
}

function normalizeReviewer(
  response: ProviderResponse,
  fallbackTask: string
): ReviewerResult {
  const parsed = parseJson(response.text);
  if (!parsed) {
    return {
      role: 'code-reviewer',
      summary: response.text.slice(0, 400) || `Reviewer fallback for: ${fallbackTask}`,
      findings: [],
      confidence: 0.4
    };
  }

  return {
    role: 'code-reviewer',
    summary: typeof parsed.summary === 'string' ? parsed.summary : 'Reviewer summary unavailable.',
    findings: normalizeReviewFindings(parsed.findings),
    confidence: toConfidence(parsed.confidence, 0.6)
  };
}

export function toArchitecturePlan(result: ArchitectResult): ArchitecturePlan {
  return {
    recommendedApproach: result.recommendedApproach,
    filesToModify: result.filesToModify,
    filesToCreate: result.filesToCreate,
    implementationSteps: result.implementationSteps,
    tradeoffs: result.tradeoffs,
    confidence: result.confidence
  };
}

export async function callSubagent(input: {
  role: SubagentRole;
  provider: ModelProvider;
  model: string;
  prompt: string;
  task: string;
  outputContract: string;
}): Promise<SubagentResult> {
  const response = await input.provider.createResponse({
    model: input.model,
    systemPrompt: input.prompt,
    messages: [
      {
        role: 'user',
        content: `Task:\n${input.task}\n\nOutput contract:\n${input.outputContract}\n\nReturn JSON only.`
      }
    ]
  });

  if (input.role === 'code-explorer') {
    return normalizeExplorer(response, input.task);
  }
  if (input.role === 'code-architect') {
    return normalizeArchitect(response, input.task);
  }
  return normalizeReviewer(response, input.task);
}

