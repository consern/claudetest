import type { FeatureDevPhase } from '../types/agent.js';
import type { ModelProvider } from '../providers/base.js';
import { featureDevPrompt } from './prompts/featureDev.js';
import { codeExplorerTask } from './subagents/codeExplorer.js';
import { codeArchitectTask } from './subagents/codeArchitect.js';
import { codeReviewerTask } from './subagents/codeReviewer.js';
import type { SubagentResult } from './subagents/shared.js';

function formatSubagentBatch(title: string, results: SubagentResult[]): string {
  const lines = [title];
  for (const result of results) {
    lines.push(
      `- ${result.role} | confidence=${result.confidence ?? 0.5}`,
      `  summary: ${result.summary}`,
      `  findings: ${(result.findings ?? []).join('; ') || 'none'}`,
      `  files: ${(result.suggestedFiles ?? []).join(', ') || 'none'}`
    );
  }
  return lines.join('\n');
}

export async function runFeatureDevWorkflow(input: {
  task: string;
  provider: ModelProvider;
  model: string;
}): Promise<Array<{ phase: FeatureDevPhase; note: string }>> {
  const notes: Array<{ phase: FeatureDevPhase; note: string }> = [];

  const todo = [
    '理解需求与边界',
    '并行探索关键代码入口',
    '并行生成架构方案',
    '确认实现计划',
    '执行最小差异改动',
    '并行审查并收敛结论'
  ];

  notes.push({
    phase: 'discovery',
    note: `feature-dev prompt loaded.\n${featureDevPrompt}\nTodo:\n${todo.map((x) => `- ${x}`).join('\n')}`
  });

  const [explorerA, explorerB] = await Promise.all([
    codeExplorerTask({ provider: input.provider, model: input.model, task: `${input.task} [track A]` }),
    codeExplorerTask({ provider: input.provider, model: input.model, task: `${input.task} [track B]` })
  ]);
  notes.push({
    phase: 'exploration',
    note: formatSubagentBatch('Exploration completed', [explorerA, explorerB])
  });

  notes.push({
    phase: 'clarification',
    note: '若需求有歧义，需先提具体问题；当前按最小可行假设进入架构阶段。'
  });

  const [architectA, architectB] = await Promise.all([
    codeArchitectTask({ provider: input.provider, model: input.model, task: `${input.task} [plan A]` }),
    codeArchitectTask({ provider: input.provider, model: input.model, task: `${input.task} [plan B]` })
  ]);
  notes.push({
    phase: 'architecture',
    note: formatSubagentBatch('Architecture options generated', [architectA, architectB])
  });

  notes.push({
    phase: 'approval',
    note: 'Approval Gate: 开始实现前需用户确认计划与影响范围。'
  });

  notes.push({
    phase: 'implementation',
    note: 'Implementation: 执行小步提交与最小 diff。'
  });

  const [reviewA, reviewB] = await Promise.all([
    codeReviewerTask({ provider: input.provider, model: input.model, task: `${input.task} [review A]` }),
    codeReviewerTask({ provider: input.provider, model: input.model, task: `${input.task} [review B]` })
  ]);

  notes.push({
    phase: 'review',
    note:
      formatSubagentBatch('Review completed', [reviewA, reviewB]) +
      '\nDecision buckets:\n- fix now\n- fix later\n- ignore'
  });

  notes.push({
    phase: 'summary',
    note: 'Summary: 已完成阶段化输出并整合子代理结果。'
  });

  return notes;
}

