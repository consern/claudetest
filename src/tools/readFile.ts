import { access, readFile } from 'node:fs/promises';
import type { ToolContext } from './types.js';

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
): Promise<ReadFileOutput> {
  const fullPath = input.path;

  try {
    await access(fullPath);
  } catch {
    return { path: fullPath, exists: false, content: '', lineCount: 0 };
  }

  const buffer = await readFile(fullPath);
  const content = buffer.subarray(0, ctx.readMaxBytes).toString('utf8');

  return {
    path: fullPath,
    exists: true,
    content,
    lineCount: content.split(/\r?\n/).length
  };
}

