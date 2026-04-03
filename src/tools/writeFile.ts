import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ToolContext, ToolExecutionResult } from './types.js';
import { previewDiffTool } from './previewDiff.js';
import { runPreToolUseChecks } from '../hooks/preToolUse.js';
import { resolvePathWithinWorkspace } from './sandbox.js';

export interface WriteFileInput {
  filePath: string;
  newContent: string;
}

export async function writeFileTool(
  input: WriteFileInput,
  ctx: ToolContext
): Promise<ToolExecutionResult> {
  if (!ctx.writeEnabled) {
    return { ok: false, summary: '写入已禁用', error: 'WRITE_ENABLED=false' };
  }

  const safePath = resolvePathWithinWorkspace(input.filePath, ctx.workspaceRoot);
  const oldContent = await readFile(safePath, 'utf8').catch(() => '');
  const check = runPreToolUseChecks({ filePath: safePath, newContent: input.newContent });

  if (!check.ok) {
    const approvedRisk = await ctx.approval.requestApproval({
      kind: 'risk-edit',
      title: '命中风险规则',
      detail: check.reason
    });

    if (!approvedRisk) {
      return { ok: false, summary: '已拒绝风险写入', error: check.reason };
    }
  }

  const diff = previewDiffTool({
    oldContent,
    newContent: input.newContent,
    filePath: safePath
  }).unifiedDiff;

  const approved = await ctx.approval.requestApproval({
    kind: 'write',
    title: `确认写入 ${safePath}`,
    detail: diff
  });

  if (!approved) {
    return { ok: false, summary: '用户取消写入', data: { diff } };
  }

  await mkdir(dirname(safePath), { recursive: true });
  await writeFile(safePath, input.newContent, 'utf8');
  return {
    ok: true,
    summary: `写入成功: ${safePath}`,
    data: { filePath: safePath, diff }
  };
}

