import { randomUUID } from 'node:crypto';
import type { ModelProvider } from '../providers/base.js';
import type { ChatMessage } from '../types/message.js';
import type { ToolContext } from '../tools/types.js';
import { createPlan } from './planner.js';
import { runFeatureDevWorkflow } from './workflow.js';
import { mainSystemPrompt } from './systemPrompt.js';
import { execShellTool } from '../tools/execShell.js';
import { readFileTool } from '../tools/readFile.js';
import { searchFilesTool } from '../tools/searchFiles.js';

export interface AgentResult {
  text: string;
  toolEvents: string[];
}

function makeMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString()
  };
}

export async function runAgentLoop(input: {
  userText: string;
  history: ChatMessage[];
  provider: ModelProvider;
  model: string;
  toolContext: ToolContext;
  cwd: string;
}): Promise<AgentResult> {
  const plan = createPlan(input.userText);
  const toolEvents: string[] = [];

  if (input.userText.startsWith('/read ')) {
    const path = input.userText.slice('/read '.length).trim();
    const out = await readFileTool({ path }, input.toolContext);
    return {
      text: out.exists
        ? `读取成功: ${out.path}\nlineCount=${out.lineCount}\n\n${out.content}`
        : `文件不存在: ${out.path}`,
      toolEvents
    };
  }

  if (input.userText.startsWith('/search ')) {
    const query = input.userText.slice('/search '.length).trim();
    const out = await searchFilesTool({ query, rootDir: input.cwd });
    return {
      text:
        out.length === 0
          ? '未找到匹配结果。'
          : out
              .map((m, i) => `${i + 1}. ${m.path}\n${m.snippet}`)
              .join('\n\n'),
      toolEvents
    };
  }

  if (input.userText.startsWith('/shell ')) {
    const command = input.userText.slice('/shell '.length).trim();
    const out = await execShellTool({ command, cwd: input.cwd }, input.toolContext);
    toolEvents.push(`exec_shell: ${command} -> ${out.exitCode}`);
    return {
      text: `exit=${out.exitCode}\nstdout:\n${out.stdout}\n\nstderr:\n${out.stderr}`,
      toolEvents
    };
  }

  if (plan.mode === 'feature-dev') {
    const phases = await runFeatureDevWorkflow(input.userText);
    return {
      text: phases.map((p) => `[${p.phase}] ${p.note}`).join('\n\n'),
      toolEvents
    };
  }

  const messages = [...input.history, makeMessage('user', input.userText)];
  const response = await input.provider.createResponse({
    model: input.model,
    systemPrompt: mainSystemPrompt,
    messages
  });

  return {
    text: response.text,
    toolEvents
  };
}

