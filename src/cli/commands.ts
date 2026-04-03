import { writeFileTool } from '../tools/writeFile.js';
import type { ToolContext } from '../tools/types.js';

export async function runCommand(
  input: string,
  ctx: ToolContext
): Promise<string | null> {
  if (!input.startsWith('/write ')) {
    return null;
  }

  const payload = input.slice('/write '.length);
  const [filePath, ...rest] = payload.split('::');

  if (!filePath || rest.length === 0) {
    return '用法: /write <absolute-path>::<content>';
  }

  const out = await writeFileTool({
    filePath: filePath.trim(),
    newContent: rest.join('::')
  }, ctx);

  return out.wrote
    ? `写入成功: ${out.filePath}`
    : `写入取消/失败: ${out.filePath}\n${out.diff}`;
}

