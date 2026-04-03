import type { ToolApprovalHandler } from '../types/tool.js';

export interface ToolContext {
  approval: ToolApprovalHandler;
  workspaceRoot: string;
  readMaxBytes: number;
  shellEnabled: boolean;
  writeEnabled: boolean;
}

