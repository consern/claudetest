import type { z } from 'zod';
import type { ToolApprovalHandler } from '../types/tool.js';

export interface ToolContext {
  approval: ToolApprovalHandler;
  workspaceRoot: string;
  readMaxBytes: number;
  shellEnabled: boolean;
  writeEnabled: boolean;
}

export interface ToolExecutionResult {
  ok: boolean;
  summary: string;
  data?: unknown;
  error?: string;
  failure?: {
    toolName: string;
    reason: string;
    recoverable: boolean;
    suggestedNextAction?: string;
  };
  telemetry?: {
    toolName: string;
    riskLevel?: 'safe' | 'review' | 'dangerous';
    sideEffectType?: 'read' | 'write' | 'exec' | 'none';
    durationMs: number;
    success: boolean;
  };
}

export interface ToolDefinition<TInput = unknown> {
  name: string;
  displayName: string;
  description: string;
  riskLevel?: 'safe' | 'review' | 'dangerous';
  sideEffectType?: 'read' | 'write' | 'exec' | 'none';
  schema: z.ZodType<TInput>;
  execute: (args: TInput, ctx: ToolContext) => Promise<ToolExecutionResult>;
}
