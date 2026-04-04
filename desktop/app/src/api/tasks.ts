import { apiGet, apiPost } from './client';
import type { AgentMode, ApiTask, ApiTaskRuntime } from '../types/workbench';

export async function getTasks(): Promise<ApiTask[]> {
  const data = await apiGet<{ tasks: ApiTask[] }>('/api/tasks');
  return data.tasks;
}

export async function startTask(input: {
  title: string;
  mode?: AgentMode;
  projectId?: string;
}): Promise<ApiTask> {
  const data = await apiPost<{ task: ApiTask }>('/api/tasks/start', input);
  return data.task;
}

export async function getTask(taskId: string): Promise<ApiTaskRuntime> {
  const data = await apiGet<{ runtime: ApiTaskRuntime }>(`/api/tasks/${taskId}`);
  return data.runtime;
}

export async function getTaskState(taskId: string): Promise<unknown> {
  return apiGet<unknown>(`/api/tasks/${taskId}/state`);
}

export async function getTaskTelemetry(taskId: string): Promise<unknown> {
  return apiGet<unknown>(`/api/tasks/${taskId}/telemetry`);
}

export async function getTaskAudit(taskId: string): Promise<unknown> {
  return apiGet<unknown>(`/api/tasks/${taskId}/audit`);
}

