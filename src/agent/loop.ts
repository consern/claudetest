import { randomUUID } from 'node:crypto';
import type { ModelProvider } from '../providers/base.js';
import type { ChatMessage } from '../types/message.js';
import type { ToolContext } from '../tools/types.js';
import type { AgentMessage } from '../types/agentMessages.js';
import type { ProviderResponse } from '../types/provider.js';
import type { AgentTelemetry } from '../types/agent.js';
import type { FeatureDevState } from '../types/workflow.js';
import { createPlan } from './planner.js';
import { runFeatureDevWorkflow } from './workflow.js';
import { mainSystemPrompt } from './systemPrompt.js';
import { executeToolByName, listToolDefinitions } from '../tools/toolRegistry.js';

export interface AgentResult {
  text: string;
  toolEvents: string[];
  telemetry?: AgentTelemetry;
  workflowState?: FeatureDevState;
}

function toAgentMessage(msg: ChatMessage): AgentMessage {
  if (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system') {
    return { role: msg.role, content: msg.content };
  }
  return { role: 'assistant', content: msg.content };
}

function chunkText(input: string, size = 30): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < input.length; i += size) {
    chunks.push(input.slice(i, i + size));
  }
  return chunks;
}

async function modelStep(input: {
  provider: ModelProvider;
  model: string;
  systemPrompt: string;
  messages: AgentMessage[];
  stream?: boolean;
  onTextChunk?: (chunk: string) => void;
}): Promise<ProviderResponse> {
  const tools = listToolDefinitions();
  if (!input.stream || !input.provider.streamResponse) {
    const response = await input.provider.createResponse({
      model: input.model,
      systemPrompt: input.systemPrompt,
      messages: input.messages,
      tools
    });
    if (input.onTextChunk && response.text) {
      for (const chunk of chunkText(response.text)) {
        input.onTextChunk(chunk);
      }
    }
    return response;
  }

  const textParts: string[] = [];
  const toolAcc = new Map<number, { id?: string; name?: string; argsText: string }>();

  for await (const event of input.provider.streamResponse({
    model: input.model,
    systemPrompt: input.systemPrompt,
    messages: input.messages,
    tools
  })) {
    if (event.type === 'text') {
      textParts.push(event.chunk);
      input.onTextChunk?.(event.chunk);
    } else if (event.type === 'tool_call_delta') {
      const prev = toolAcc.get(event.index) ?? { argsText: '' };
      prev.id = event.id ?? prev.id;
      prev.name = event.name ?? prev.name;
      prev.argsText += event.argumentsChunk ?? '';
      toolAcc.set(event.index, prev);
    }
  }

  const toolCalls = [...toolAcc.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, item], idx) => {
      let args: Record<string, unknown> = {};
      try {
        args = item.argsText ? (JSON.parse(item.argsText) as Record<string, unknown>) : {};
      } catch {
        args = {};
      }
      return {
        id: item.id ?? `stream_call_${idx}`,
        name: item.name ?? 'unknown_tool',
        args
      };
    });

  return {
    text: textParts.join(''),
    toolCalls,
    stopReason: toolCalls.length > 0 ? 'tool_calls' : 'final'
  };
}

export async function runAgentLoop(input: {
  userText: string;
  history: ChatMessage[];
  provider: ModelProvider;
  model: string;
  toolContext: ToolContext;
  cwd: string;
  maxIterations?: number;
  onTextChunk?: (chunk: string) => void;
  onToolEvent?: (event: string) => void;
  onTelemetry?: (telemetry: AgentTelemetry) => void;
}): Promise<AgentResult> {
  const plan = createPlan(input.userText);
  const toolEvents: string[] = [];
  const maxIterations = input.maxIterations ?? 6;

  if (plan.mode === 'feature-dev') {
    const workflow = await runFeatureDevWorkflow({
      task: input.userText,
      provider: input.provider,
      model: input.model,
      toolContext: input.toolContext,
      onToolEvent: input.onToolEvent,
      onPhase: (phase) => {
        input.onTelemetry?.({
          mode: 'feature-dev',
          loopRound: 0,
          maxIterations,
          currentPhase: phase
        });
      },
      onActiveSubagent: (name) => {
        input.onTelemetry?.({
          mode: 'feature-dev',
          loopRound: 0,
          maxIterations,
          activeSubagent: name
        });
      }
    });

    return {
      text: workflow.notes.map((p) => `[${p.phase}] ${p.note}`).join('\n\n'),
      toolEvents,
      workflowState: workflow.state,
      telemetry: {
        mode: 'feature-dev',
        loopRound: workflow.phaseHistory.length,
        maxIterations,
        currentPhase: workflow.phaseHistory.at(-1),
        activeSubagent: workflow.activeSubagentHistory.at(-1)
      }
    };
  }

  const conversation: AgentMessage[] = [
    ...input.history.map(toAgentMessage),
    { role: 'user', content: input.userText }
  ];

  for (let round = 0; round < maxIterations; round += 1) {
    input.onTelemetry?.({
      mode: 'chat',
      loopRound: round + 1,
      maxIterations
    });

    const response = await modelStep({
      provider: input.provider,
      model: input.model,
      systemPrompt: mainSystemPrompt,
      messages: conversation,
      stream: true,
      onTextChunk: input.onTextChunk
    });

    if (!response.toolCalls || response.toolCalls.length === 0) {
      const finalText = response.text || 'No usable output.';
      conversation.push({ role: 'assistant', content: finalText });
      return {
        text: finalText,
        toolEvents,
        telemetry: {
          mode: 'chat',
          loopRound: round + 1,
          maxIterations
        }
      };
    }

    if (response.text) {
      conversation.push({ role: 'assistant', content: response.text });
    }

    for (const toolCall of response.toolCalls) {
      const callId = toolCall.id || randomUUID();
      conversation.push({
        role: 'tool_call',
        id: callId,
        toolName: toolCall.name,
        args: toolCall.args
      });

      const start = `tool_call: ${toolCall.name}(${JSON.stringify(toolCall.args)})`;
      toolEvents.push(start);
      input.onToolEvent?.(start);
      input.onTelemetry?.({
        mode: 'chat',
        loopRound: round + 1,
        maxIterations,
        currentToolCall: start
      });

      const result = await executeToolByName(toolCall.name, toolCall.args, input.toolContext);
      conversation.push({
        role: 'tool_result',
        id: callId,
        toolName: toolCall.name,
        result
      });

      const end = `tool_result: ${toolCall.name} -> ${result.summary}`;
      toolEvents.push(end);
      input.onToolEvent?.(end);
    }
  }

  return {
    text: 'Reached max iterations. Stop to prevent infinite loops.',
    toolEvents,
    telemetry: {
      mode: 'chat',
      loopRound: maxIterations,
      maxIterations
    }
  };
}

