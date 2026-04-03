import type { ToolApprovalHandler, ToolApprovalRequest } from '../types/tool.js';

export class ApprovalService implements ToolApprovalHandler {
  constructor(
    private readonly approve: (request: ToolApprovalRequest) => Promise<boolean>
  ) {}

  async requestApproval(request: ToolApprovalRequest): Promise<boolean> {
    return this.approve(request);
  }
}

