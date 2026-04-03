import { z } from 'zod';
import { readFileTool } from './readFile.js';
import { searchFilesTool } from './searchFiles.js';
import { writeFileTool } from './writeFile.js';
import { execShellTool } from './execShell.js';
import { previewDiffTool } from './previewDiff.js';
import type { ToolContext, ToolDefinition, ToolExecutionResult } from './types.js';
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
    displayName: 'Read File',
    description: 'Read file content inside workspace',
    riskLevel: 'safe',
    sideEffectType: 'read',
    schema: readFileSchema,
    execute: async (args, ctx) =>
      readFileTool(args as z.infer<typeof readFileSchema>, ctx)
  },
  {
    name: 'search_files',
    displayName: 'Search Files',
    description: 'Search text across workspace files',
    riskLevel: 'safe',
    sideEffectType: 'read',
    schema: searchFilesSchema,
    execute: async (args, ctx) =>
      searchFilesTool(args as z.infer<typeof searchFilesSchema>, ctx)
  },
  {
    name: 'write_file',
    displayName: 'Write File',
    description: 'Write file after diff + approval',
    riskLevel: 'review',
    sideEffectType: 'write',
    schema: writeFileSchema,
    execute: async (args, ctx) =>
      writeFileTool(args as z.infer<typeof writeFileSchema>, ctx)
  },
  {
    name: 'exec_shell',
    displayName: 'Exec Shell',
    description: 'Execute shell command in workspace with approval',
    riskLevel: 'review',
    sideEffectType: 'exec',
    schema: execShellSchema,
    execute: async (args, ctx) =>
      execShellTool(args as z.infer<typeof execShellSchema>, ctx)
  },
  {
    name: 'preview_diff',
    displayName: 'Preview Diff',
    description: 'Generate unified diff from two file versions',
    riskLevel: 'safe',
    sideEffectType: 'none',
    schema: previewDiffSchema,
    execute: async (args) => ({
      ok: true,
      summary: 'Generated diff preview',
      data: previewDiffTool(args as z.infer<typeof previewDiffSchema>).unifiedDiff
    })
  }
];

export function listToolDefinitions(): ProviderToolDefinition[] {
  return definitions.map((tool) => ({
    name: tool.name,
    description: `${tool.description} (risk=${tool.riskLevel ?? 'review'}, sideEffect=${
      tool.sideEffectType ?? 'none'
    })`,
    inputSchema: z.toJSONSchema(tool.schema)
  }));
}

export async function executeToolByName(
  name: string,
  args: unknown,
  ctx: ToolContext
): Promise<ToolExecutionResult> {
  const startedAt = Date.now();
  const tool = definitions.find((item) => item.name === name);
  if (!tool) {
    return {
      ok: false,
      summary: `Unknown tool: ${name}`,
      failure: {
        toolName: name,
        reason: 'Tool not found',
        recoverable: true,
        suggestedNextAction: 'Choose one of the registered tools.'
      },
      telemetry: {
        toolName: name,
        durationMs: Date.now() - startedAt,
        success: false
      }
    };
  }

  const parsed = tool.schema.safeParse(args);
  if (!parsed.success) {
    return {
      ok: false,
      summary: `Tool argument validation failed: ${name}`,
      error: parsed.error.message,
      failure: {
        toolName: name,
        reason: parsed.error.message,
        recoverable: true,
        suggestedNextAction: 'Fix tool arguments and retry.'
      },
      telemetry: {
        toolName: name,
        riskLevel: tool.riskLevel,
        sideEffectType: tool.sideEffectType,
        durationMs: Date.now() - startedAt,
        success: false
      }
    };
  }

  try {
    const result = await tool.execute(parsed.data, ctx);
    return {
      ...result,
      telemetry: {
        toolName: name,
        riskLevel: tool.riskLevel,
        sideEffectType: tool.sideEffectType,
        durationMs: Date.now() - startedAt,
        success: result.ok
      }
    };
  } catch (error) {
    return {
      ok: false,
      summary: `Tool execution failed: ${name}`,
      error: error instanceof Error ? error.message : String(error),
      failure: {
        toolName: name,
        reason: error instanceof Error ? error.message : String(error),
        recoverable: true,
        suggestedNextAction: 'Review error and retry or adapt plan.'
      },
      telemetry: {
        toolName: name,
        riskLevel: tool.riskLevel,
        sideEffectType: tool.sideEffectType,
        durationMs: Date.now() - startedAt,
        success: false
      }
    };
  }
}
