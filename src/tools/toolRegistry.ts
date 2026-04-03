import { z } from 'zod';
import { readFileTool } from './readFile.js';
import { searchFilesTool } from './searchFiles.js';
import { writeFileTool } from './writeFile.js';
import { execShellTool } from './execShell.js';
import { previewDiffTool } from './previewDiff.js';
import type {
  ToolContext,
  ToolDefinition,
  ToolExecutionResult
} from './types.js';
import type { ProviderToolDefinition } from '../types/provider.js';

const readFileSchema = z.object({
  path: z.string().min(1)
});

const searchFilesSchema = z.object({
  query: z.string().min(1),
  glob: z.string().optional()
});

const writeFileSchema = z.object({
  filePath: z.string().min(1),
  newContent: z.string()
});

const execShellSchema = z.object({
  command: z.string().min(1)
});

const previewDiffSchema = z.object({
  oldContent: z.string(),
  newContent: z.string(),
  filePath: z.string().min(1)
});

const definitions: ToolDefinition[] = [
  {
    name: 'read_file',
    description: 'Read file content inside workspace',
    schema: readFileSchema,
    execute: async (args, ctx) => readFileTool(args as z.infer<typeof readFileSchema>, ctx)
  },
  {
    name: 'search_files',
    description: 'Search text across workspace files',
    schema: searchFilesSchema,
    execute: async (args, ctx) => searchFilesTool(args as z.infer<typeof searchFilesSchema>, ctx)
  },
  {
    name: 'write_file',
    description: 'Write file after diff + approval',
    schema: writeFileSchema,
    execute: async (args, ctx) => writeFileTool(args as z.infer<typeof writeFileSchema>, ctx)
  },
  {
    name: 'exec_shell',
    description: 'Execute shell command in workspace with approval',
    schema: execShellSchema,
    execute: async (args, ctx) => execShellTool(args as z.infer<typeof execShellSchema>, ctx)
  },
  {
    name: 'preview_diff',
    description: 'Generate unified diff from two file versions',
    schema: previewDiffSchema,
    execute: async (args) => ({
      ok: true,
      summary: 'diff generated',
      data: previewDiffTool(args as z.infer<typeof previewDiffSchema>).unifiedDiff
    })
  }
];

export function listToolDefinitions(): ProviderToolDefinition[] {
  return definitions.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: z.toJSONSchema(tool.schema)
  }));
}

export async function executeToolByName(
  name: string,
  args: unknown,
  ctx: ToolContext
): Promise<ToolExecutionResult> {
  const tool = definitions.find((item) => item.name === name);
  if (!tool) {
    return { ok: false, summary: `未知工具: ${name}` };
  }

  const parsed = tool.schema.safeParse(args);
  if (!parsed.success) {
    return {
      ok: false,
      summary: `工具参数校验失败: ${name}`,
      error: parsed.error.message
    };
  }

  try {
    return await tool.execute(parsed.data, ctx);
  } catch (error) {
    return {
      ok: false,
      summary: `工具执行异常: ${name}`,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
