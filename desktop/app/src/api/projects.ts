import { apiGet, apiPost } from './client';
import type { ApiProject } from '../types/workbench';

export async function getProjects(): Promise<ApiProject[]> {
  const data = await apiGet<{ projects: ApiProject[] }>('/api/projects');
  return data.projects;
}

export async function openProject(input: {
  rootPath: string;
  name?: string;
}): Promise<ApiProject> {
  const data = await apiPost<{ project: ApiProject }>('/api/projects/open', input);
  return data.project;
}

