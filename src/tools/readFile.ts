import { access, readFile } from 'node:fs/promises';
import type { ToolContext, ToolExecutionResult } from './types.js';
import { resolvePathWithinWorkspace } from './sandbox.js';

export interface ReadFileInput {
  path: string;
}

export interface ReadFileOutput {
  path: string;
  exists: boolean;
  content: string;
  lineCount: number;
}

export async function readFileTool(
  input: ReadFileInput,
  ctx: ToolContext
): Promise<ToolExecutionResult> {
  const fullPath = resolvePathWithinWorkspace(input.path, ctx.workspaceRoot);

  try {
    await access(fullPath);
  } catch {
    return {
      ok: true,
      summary: `文件不存在: ${fullPath}`,
      data: { path: fullPath, exists: false, content: '', lineCount: 0 } satisfies ReadFileOutput
    };
  }

  const buffer = await readFile(fullPath);
  const content = buffer.subarray(0, ctx.readMaxBytes).toString('utf8');
  const result: ReadFileOutput = {
    path: fullPath,
    exists: true,
    content,
    lineCount: content.split(/\r?\n/).length
  };

  return {
    ok: true,
    summary: `读取成功: ${fullPath} (${result.lineCount} 行)`,
    data: result
  };
}

