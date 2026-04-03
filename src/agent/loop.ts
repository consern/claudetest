import { randomUUID } from 'node:crypto';
import type { ModelProvider } from '../providers/base.js';
import type { ChatMessage } from '../types/message.js';
import type { ToolContext } from '../tools/types.js';
import type { AgentMessage } from '../types/agentMessages.js';
import type { ProviderResponse } from '../types/provider.js';
import type { AgentMode, FeatureDevPhase, LoopTelemetry } from '../types/agent.js';
import type { FeatureDevState } from '../types/workflow.js';
import { createPlan } from './planner.js';
import { runFeatureDevWorkflow } from './workflow.js';
import { selectMainPrompt } from './systemPrompt.js';
import { executeToolByName, listToolDefinitions } from '../tools/toolRegistry.js';

export interface AgentResult {
  text: string;
  toolEvents: string[];
  telemetry?: LoopTelemetry;
  workflowState?: FeatureDevState;
  phaseStatus?: Partial<Record<FeatureDevPhase, 'pending' | 'active' | 'done' | 'blocked'>>;
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
  mode: AgentMode;
  messages: AgentMessage[];
  stream?: boolean;
  onTextChunk?: (chunk: string) => void;
}): Promise<ProviderResponse> {
  const tools = listToolDefinitions();
  const prompt = selectMainPrompt(input.mode);
  if (!input.stream || !input.provider.streamResponse) {
    const response = await input.provider.createResponse({
      model: input.model,
      systemPrompt: prompt,
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
    systemPrompt: prompt,
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
  onTelemetry?: (telemetry: LoopTelemetry) => void;
}): Promise<AgentResult> {
  const plan = createPlan(input.userText);
  const mode = plan.mode;
  const toolEvents: string[] = [];
  const maxIterations = input.maxIterations ?? 6;

  if (mode === 'feature-dev') {
    let lastWriteResult = '';
    let lastReviewDecision = '';
    const workflow = await runFeatureDevWorkflow({
      task: input.userText,
      provider: input.provider,
      model: input.model,
      toolContext: input.toolContext,
      onToolEvent: input.onToolEvent,
      onPhase: (phase) => {
        input.onTelemetry?.({
          round: 0,
          activeMode: 'feature-dev',
          activePhase: phase,
          maxIterations
        });
      },
      onActiveSubagent: (name) => {
        input.onTelemetry?.({
          round: 0,
          activeMode: 'feature-dev',
          activeSubagent: name,
          maxIterations
        });
      },
      onImplementationStep: (stepId) => {
        input.onTelemetry?.({
          round: 0,
          activeMode: 'feature-dev',
          activeImplementationStep: stepId,
          maxIterations
        });
      },
      onBlocked: (reason) => {
        input.onTelemetry?.({
          round: 0,
          activeMode: 'feature-dev',
          blockedReason: reason,
          lastError: reason,
          maxIterations
        });
      },
      onWriteResult: (summary) => {
        lastWriteResult = summary;
        input.onTelemetry?.({
          round: 0,
          activeMode: 'feature-dev',
          lastWriteResult: summary,
          maxIterations
        });
      },
      onReviewDecision: (summary) => {
        lastReviewDecision = summary;
        input.onTelemetry?.({
          round: 0,
          activeMode: 'feature-dev',
          lastReviewDecision: summary,
          maxIterations
        });
      }
    });

    return {
      text: workflow.notes.map((p) => `[${p.phase}] ${p.note}`).join('\n\n'),
      toolEvents,
      workflowState: workflow.state,
      phaseStatus: workflow.phaseStatus,
      telemetry: {
        round: workflow.phaseHistory.length,
        activeMode:
          workflow.state.currentStepId?.startsWith('rework-') ? 'rework' : 'feature-dev',
        activePhase: workflow.phaseHistory.at(-1),
        activeSubagent: workflow.activeSubagentHistory.at(-1),
        activeImplementationStep: workflow.state.currentStepId,
        blockedReason: workflow.state.blockedReason,
        activeStepExecutionSummary: workflow.state.stepExecutionResults.at(-1)?.summary,
        lastWriteResult,
        lastReviewDecision: lastReviewDecision || workflow.actionableNextSteps.join(' | '),
        maxIterations
      }
    };
  }

  const conversation: AgentMessage[] = [
    ...input.history.map(toAgentMessage),
    { role: 'user', content: input.userText }
  ];

  for (let round = 0; round < maxIterations; round += 1) {
    input.onTelemetry?.({
      round: round + 1,
      activeMode: mode,
      maxIterations
    });

    const response = await modelStep({
      provider: input.provider,
      model: input.model,
      mode,
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
          round: round + 1,
          activeMode: mode,
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
        round: round + 1,
        activeMode: mode,
        activeTool: start,
        maxIterations
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
      round: maxIterations,
      activeMode: mode,
      lastError: 'Max iterations reached',
      maxIterations
    }
  };
}
