import { readFile, writeFile } from 'node:fs/promises';
import type { ToolContext } from './types.js';
import { previewDiffTool } from './previewDiff.js';
import { runPreToolUseChecks } from '../hooks/preToolUse.js';

export interface WriteFileInput {
  filePath: string;
  newContent: string;
}

export interface WriteFileOutput {
  filePath: string;
  wrote: boolean;
  diff: string;
}

export async function writeFileTool(
  input: WriteFileInput,
  ctx: ToolContext
): Promise<WriteFileOutput> {
  if (!ctx.writeEnabled) {
    return { filePath: input.filePath, wrote: false, diff: 'WRITE_ENABLED=false' };
  }

  const oldContent = await readFile(input.filePath, 'utf8').catch(() => '');
  const check = runPreToolUseChecks({ filePath: input.filePath, newContent: input.newContent });

  if (!check.ok) {
    const approvedRisk = await ctx.approval.requestApproval({
      kind: 'risk-edit',
      title: '命中风险规则',
      detail: check.reason
    });

    if (!approvedRisk) {
      return { filePath: input.filePath, wrote: false, diff: check.reason };
    }
  }

  const diff = previewDiffTool({
    oldContent,
    newContent: input.newContent,
    filePath: input.filePath
  }).unifiedDiff;

  const approved = await ctx.approval.requestApproval({
    kind: 'write',
    title: `确认写入 ${input.filePath}`,
    detail: diff
  });

  if (!approved) {
    return { filePath: input.filePath, wrote: false, diff };
  }

  await writeFile(input.filePath, input.newContent, 'utf8');
  return { filePath: input.filePath, wrote: true, diff };
}

