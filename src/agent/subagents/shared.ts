import { z } from 'zod';
import type { ModelProvider } from '../../providers/base.js';
import type { ArchitecturePlan, ImplementationStep, ReviewFinding } from '../../types/workflow.js';

export type SubagentRole = 'code-explorer' | 'code-architect' | 'code-reviewer';

const reviewFindingSchema = z.object({
  title: z.string().min(1),
  whyItMatters: z.string().min(1),
  evidence: z.string().min(1),
  confidence: z.number().min(0).max(1),
  category: z.enum(['bug', 'security', 'guideline', 'performance'])
});

const explorerSchema = z.object({
  summary: z.string().min(1),
  findings: z.array(z.string()).default([]),
  entryPoints: z.array(z.string()).default([]),
  relevantPaths: z.array(z.string()).default([]),
  suggestedFiles: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.6)
});

const architectSchema = z.object({
  summary: z.string().min(1),
  recommendedApproach: z.string().min(1),
  filesToModify: z.array(z.string()).default([]),
  filesToCreate: z.array(z.string()).default([]),
  implementationSteps: z.array(z.string()).default([]),
  tradeoffs: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.6)
});

const reviewerSchema = z.object({
  summary: z.string().min(1),
  findings: z.array(reviewFindingSchema).default([]),
  confidence: z.number().min(0).max(1).default(0.6)
});

type ExplorerParsed = z.infer<typeof explorerSchema>;
type ArchitectParsed = z.infer<typeof architectSchema>;
type ReviewerParsed = z.infer<typeof reviewerSchema>;

export interface ExplorerResult extends ExplorerParsed {
  role: 'code-explorer';
  degraded?: boolean;
  error?: string;
  rawText?: string;
  rawTextPreview?: string;
  failureStage?: string;
  retryCount?: number;
}

export interface ArchitectResult extends ArchitectParsed {
  role: 'code-architect';
  degraded?: boolean;
  error?: string;
  rawText?: string;
  rawTextPreview?: string;
  failureStage?: string;
  retryCount?: number;
}

export interface ReviewerResult extends ReviewerParsed {
  role: 'code-reviewer';
  degraded?: boolean;
  error?: string;
  rawText?: string;
  rawTextPreview?: string;
  failureStage?: string;
  retryCount?: number;
}

export type SubagentResult = ExplorerResult | ArchitectResult | ReviewerResult;

const roleToSchema = {
  'code-explorer': explorerSchema,
  'code-architect': architectSchema,
  'code-reviewer': reviewerSchema
} as const;

function extractLikelyJson(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) {
    return trimmed.slice(first, last + 1);
  }
  return null;
}

function tryParseJson(raw: string): unknown | null {
  const direct = extractLikelyJson(raw);
  if (!direct) {
    return null;
  }
  try {
    return JSON.parse(direct);
  } catch {
    return null;
  }
}

function toDegradedResult(
  role: SubagentRole,
  task: string,
  error: string,
  rawText: string,
  failureStage: string,
  retryCount: number
): SubagentResult {
  if (role === 'code-explorer') {
    return {
      role,
      summary: `Degraded explorer result for task: ${task}`,
      findings: [],
      entryPoints: [],
      relevantPaths: [],
      suggestedFiles: [],
      risks: [],
      confidence: 0.3,
      degraded: true,
      error,
      rawText: rawText.slice(0, 1500)
      ,
      rawTextPreview: rawText.slice(0, 200),
      failureStage,
      retryCount
    };
  }
  if (role === 'code-architect') {
    return {
      role,
      summary: `Degraded architect result for task: ${task}`,
      recommendedApproach: 'No reliable architecture output. Keep minimal safe change.',
      filesToModify: [],
      filesToCreate: [],
      implementationSteps: [],
      tradeoffs: [],
      confidence: 0.3,
      degraded: true,
      error,
      rawText: rawText.slice(0, 1500)
      ,
      rawTextPreview: rawText.slice(0, 200),
      failureStage,
      retryCount
    };
  }
  return {
    role,
    summary: `Degraded reviewer result for task: ${task}`,
    findings: [],
    confidence: 0.3,
    degraded: true,
    error,
    rawText: rawText.slice(0, 1500),
    rawTextPreview: rawText.slice(0, 200),
    failureStage,
    retryCount
  };
}

async function askSubagent(input: {
  provider: ModelProvider;
  model: string;
  prompt: string;
  task: string;
  outputContract: string;
  strictJsonMode?: boolean;
}): Promise<string> {
  const strictLine = input.strictJsonMode
    ? '\nSTRICT: output valid JSON object only. No markdown. No prose outside JSON.'
    : '';
  const response = await input.provider.createResponse({
    model: input.model,
    systemPrompt: input.prompt,
    messages: [
      {
        role: 'user',
        content:
          `Task:\n${input.task}\n\n` +
          `Output contract:\n${input.outputContract}\n` +
          strictLine
      }
    ]
  });
  return response.text ?? '';
}

function validateByRole(role: SubagentRole, parsed: unknown): SubagentResult | null {
  const schema = roleToSchema[role];
  const safe = schema.safeParse(parsed);
  if (!safe.success) {
    return null;
  }
  return { role, ...safe.data } as SubagentResult;
}

export function applyReviewerPrecisionGate(
  findings: ReviewFinding[],
  threshold = 0.8
): ReviewFinding[] {
  return findings.filter((finding) => {
    if (!finding.evidence?.trim() || !finding.whyItMatters?.trim()) {
      return false;
    }
    if (finding.category === 'security') {
      return finding.confidence >= 0.75;
    }
    return finding.confidence >= threshold;
  });
}

async function validateHighRiskFindings(input: {
  provider: ModelProvider;
  model: string;
  findings: ReviewFinding[];
}): Promise<ReviewFinding[]> {
  const highRisk = input.findings.filter(
    (f) => (f.category === 'security' || f.category === 'bug') && f.confidence >= 0.8
  );
  if (highRisk.length === 0) {
    return input.findings;
  }

  const response = await input.provider.createResponse({
    model: input.model,
    systemPrompt:
      'You are a strict validation pass. For each finding return keep=true only if evidence is sufficient.',
    messages: [
      {
        role: 'user',
        content:
          'Validate high-risk findings and return JSON array: [{"title":"...", "keep": true|false}]' +
          `\n\nFindings:\n${JSON.stringify(highRisk)}`
      }
    ]
  });

  const parsed = tryParseJson(response.text ?? '');
  if (!Array.isArray(parsed)) {
    return input.findings;
  }
  const keepMap = new Map<string, boolean>();
  for (const row of parsed) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const rec = row as Record<string, unknown>;
    if (typeof rec.title === 'string' && typeof rec.keep === 'boolean') {
      keepMap.set(rec.title, rec.keep);
    }
  }
  return input.findings.filter((f) => (keepMap.has(f.title) ? keepMap.get(f.title) : true));
}

export async function callSubagent(input: {
  role: SubagentRole;
  provider: ModelProvider;
  model: string;
  prompt: string;
  task: string;
  outputContract: string;
  retryOnMalformed?: boolean;
}): Promise<SubagentResult> {
  const firstRaw = await askSubagent({
    provider: input.provider,
    model: input.model,
    prompt: input.prompt,
    task: input.task,
    outputContract: input.outputContract
  });

  const firstParsed = tryParseJson(firstRaw);
  const firstValidated = validateByRole(input.role, firstParsed);
  if (firstValidated) {
    if (firstValidated.role === 'code-reviewer') {
      const filtered = applyReviewerPrecisionGate(firstValidated.findings);
      const validated = await validateHighRiskFindings({
        provider: input.provider,
        model: input.model,
        findings: filtered
      });
      return { ...firstValidated, findings: validated };
    }
    return firstValidated;
  }

  // Repair attempt with strict JSON-only retry.
  if (input.retryOnMalformed !== false) {
    const retryRaw = await askSubagent({
      provider: input.provider,
      model: input.model,
      prompt: input.prompt,
      task: input.task,
      outputContract: input.outputContract,
      strictJsonMode: true
    });
    const retryParsed = tryParseJson(retryRaw);
    const retryValidated = validateByRole(input.role, retryParsed);
    if (retryValidated) {
      if (retryValidated.role === 'code-reviewer') {
        const filtered = applyReviewerPrecisionGate(retryValidated.findings);
        const validated = await validateHighRiskFindings({
          provider: input.provider,
          model: input.model,
          findings: filtered
        });
        return { ...retryValidated, findings: validated };
      }
      return retryValidated;
    }
    return toDegradedResult(
      input.role,
      input.task,
      'Malformed JSON after repair+retry',
      `${firstRaw}\n---\n${retryRaw}`,
      'retry-parse',
      1
    );
  }

  return toDegradedResult(
    input.role,
    input.task,
    'Malformed JSON output',
    firstRaw,
    'initial-parse',
    0
  );
}

export function toArchitecturePlan(result: ArchitectResult): ArchitecturePlan {
  const steps: ImplementationStep[] = result.implementationSteps.map((description, idx) => ({
    id: `step-${idx + 1}`,
    description,
    targetFiles: idx === 0 ? [...result.filesToModify] : [...result.filesToCreate],
    status: 'pending'
  }));

  return {
    summary: result.summary,
    recommendedApproach: result.recommendedApproach,
    filesToModify: result.filesToModify,
    filesToCreate: result.filesToCreate,
    implementationSteps: steps,
    tradeoffs: result.tradeoffs,
    confidence: result.confidence
  };
}
