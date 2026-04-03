export interface ToolApprovalRequest {
  kind: 'write' | 'shell' | 'risk-edit';
  title: string;
  detail: string;
}

export interface ToolApprovalHandler {
  requestApproval(request: ToolApprovalRequest): Promise<boolean>;
}

export interface ToolResult {
  ok: boolean;
  summary: string;
  detail?: string;
}

