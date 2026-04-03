import { writeFileTool } from '../tools/writeFile.js';
import type { ToolContext } from '../tools/types.js';
import { executeToolByName } from '../tools/toolRegistry.js';

export async function runCommand(
  input: string,
  ctx: ToolContext
): Promise<string | null> {
  if (input.startsWith('/read ')) {
    const path = input.slice('/read '.length).trim();
    const out = await executeToolByName('read_file', { path }, ctx);
    return `${out.summary}\n${JSON.stringify(out.data ?? {}, null, 2)}`;
  }

  if (input.startsWith('/search ')) {
    const query = input.slice('/search '.length).trim();
    const out = await executeToolByName('search_files', { query }, ctx);
    return `${out.summary}\n${JSON.stringify(out.data ?? [], null, 2)}`;
  }

  if (input.startsWith('/shell ')) {
    const command = input.slice('/shell '.length).trim();
    const out = await executeToolByName('exec_shell', { command }, ctx);
    return `${out.summary}\n${JSON.stringify(out.data ?? out.error ?? '', null, 2)}`;
  }

  if (!input.startsWith('/write ')) {
    return null;
  }

  const payload = input.slice('/write '.length);
  const [filePath, ...rest] = payload.split('::');

  if (!filePath || rest.length === 0) {
    return '用法: /write <workspace-relative-path>::<content>';
  }

  const out = await writeFileTool(
    {
      filePath: filePath.trim(),
      newContent: rest.join('::')
    },
    ctx
  );

  return out.ok
    ? out.summary
    : `${out.summary}${out.error ? `\n${out.error}` : ''}`;
}
