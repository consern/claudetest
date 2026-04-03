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
}

export interface ToolDefinition<TInput = unknown> {
  name: string;
  description: string;
  schema: z.ZodType<TInput>;
  execute: (args: TInput, ctx: ToolContext) => Promise<ToolExecutionResult>;
}

