import { apiGet } from './client';

export async function getSessions(): Promise<Array<{ id: string; path: string }>> {
  const data = await apiGet<{ sessions: Array<{ id: string; path: string }> }>('/api/sessions');
  return data.sessions;
}

