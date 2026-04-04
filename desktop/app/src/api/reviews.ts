import { apiGet, apiPost } from './client';
import type { ApiTaskRuntime } from '../types/workbench';

export async function getReviews(): Promise<Array<{ taskId: string; fixNow: number; fixLater: number; ignore: number; lifecycle: number }>> {
  const data = await apiGet<{ reviews: Array<{ taskId: string; fixNow: number; fixLater: number; ignore: number; lifecycle: number }> }>('/api/reviews');
  return data.reviews;
}

export async function getReview(taskId: string): Promise<ApiTaskRuntime> {
  const data = await apiGet<{ review: ApiTaskRuntime }>(`/api/reviews/${taskId}`);
  return data.review;
}

export async function triggerRework(taskId: string): Promise<void> {
  await apiPost(`/api/reviews/${taskId}/rework`);
}

