import type { FeatureDevPhase } from '../types/agent.js';
import { codeExplorerTask } from './subagents/codeExplorer.js';
import { codeArchitectTask } from './subagents/codeArchitect.js';
import { codeReviewerTask } from './subagents/codeReviewer.js';

export async function runFeatureDevWorkflow(task: string): Promise<Array<{ phase: FeatureDevPhase; note: string }>> {
  const notes: Array<{ phase: FeatureDevPhase; note: string }> = [];

  notes.push({ phase: 'discovery', note: '已建立任务理解与todo。' });

  const [explorerA, explorerB] = await Promise.all([
    codeExplorerTask(`${task} [A]`),
    codeExplorerTask(`${task} [B]`)
  ]);
  notes.push({ phase: 'exploration', note: `${explorerA}\n${explorerB}` });

  notes.push({ phase: 'clarification', note: '未检测到阻塞性歧义，继续执行。' });

  const [architectA, architectB] = await Promise.all([
    codeArchitectTask(`${task} [A]`),
    codeArchitectTask(`${task} [B]`)
  ]);
  notes.push({ phase: 'architecture', note: `${architectA}\n${architectB}` });

  notes.push({ phase: 'approval', note: '进入实现前需要用户确认。' });
  notes.push({ phase: 'implementation', note: '执行最小差异实现。' });

  const [reviewA, reviewB] = await Promise.all([
    codeReviewerTask(`${task} [A]`),
    codeReviewerTask(`${task} [B]`)
  ]);
  notes.push({ phase: 'review', note: `${reviewA}\n${reviewB}` });

  notes.push({ phase: 'summary', note: '已完成阶段总结。' });
  return notes;
}

