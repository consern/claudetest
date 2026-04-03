import { execa } from 'execa';
import type { ToolContext, ToolExecutionResult } from './types.js';
import { classifyShellRisk } from './shellRisk.js';

export interface ExecShellInput {
  command: string;
}

export async function execShellTool(
  input: ExecShellInput,
  ctx: ToolContext
): Promise<ToolExecutionResult> {
  if (!ctx.shellEnabled) {
    return { ok: false, summary: 'Shell 已禁用', error: 'SHELL_ENABLED=false' };
  }

  const risk = classifyShellRisk(input.command);

  if (risk.level === 'dangerous') {
    const riskApproved = await ctx.approval.requestApproval({
      kind: 'shell',
      title: `高风险命令二次确认: ${input.command}`,
      detail: `${risk.reason}\ncwd=${ctx.workspaceRoot}`
    });
    if (!riskApproved) {
      return { ok: false, summary: '已拒绝高风险命令', error: risk.reason };
    }
  }

  const approved = await ctx.approval.requestApproval({
    kind: 'shell',
    title: `确认执行命令: ${input.command}`,
    detail: `risk=${risk.level}\n${risk.reason}\ncwd=${ctx.workspaceRoot}`
  });

  if (!approved) {
    return { ok: false, summary: '用户取消执行', error: 'User denied' };
  }

  try {
    const result = await execa(input.command, {
      cwd: ctx.workspaceRoot,
      shell: true,
      reject: false
    });

    return {
      ok: result.exitCode === 0,
      summary: `命令完成: exit=${result.exitCode ?? 0}`,
      data: {
        command: input.command,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode ?? 0,
        risk: risk.level
      }
    };
  } catch (error) {
    return {
      ok: false,
      summary: '命令执行异常',
      error: error instanceof Error ? error.message : 'Unknown shell error'
    };
  }
}

