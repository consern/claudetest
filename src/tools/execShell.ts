import { execa } from 'execa';
import type { ToolContext } from './types.js';

export interface ExecShellInput {
  command: string;
  cwd: string;
}

export interface ExecShellOutput {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  executed: boolean;
}

export async function execShellTool(
  input: ExecShellInput,
  ctx: ToolContext
): Promise<ExecShellOutput> {
  if (!ctx.shellEnabled) {
    return {
      command: input.command,
      stdout: '',
      stderr: 'SHELL_ENABLED=false',
      exitCode: 1,
      executed: false
    };
  }

  const approved = await ctx.approval.requestApproval({
    kind: 'shell',
    title: `确认执行命令: ${input.command}`,
    detail: `cwd=${input.cwd}`
  });

  if (!approved) {
    return {
      command: input.command,
      stdout: '',
      stderr: 'User denied',
      exitCode: 1,
      executed: false
    };
  }

  try {
    const result = await execa(input.command, {
      cwd: input.cwd,
      shell: true,
      reject: false
    });

    return {
      command: input.command,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode ?? 0,
      executed: true
    };
  } catch (error) {
    return {
      command: input.command,
      stdout: '',
      stderr: error instanceof Error ? error.message : 'Unknown shell error',
      exitCode: 1,
      executed: true
    };
  }
}

