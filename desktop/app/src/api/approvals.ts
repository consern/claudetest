import { apiGet, apiPost } from './client';
import type { ApiApproval } from '../types/workbench';

export async function getApprovals(): Promise<ApiApproval[]> {
  const data = await apiGet<{ approvals: ApiApproval[] }>('/api/approvals');
  return data.approvals;
}

export async function approve(id: string): Promise<void> {
  await apiPost(`/api/approvals/${id}/approve`);
}

export async function reject(id: string): Promise<void> {
  await apiPost(`/api/approvals/${id}/reject`);
}

