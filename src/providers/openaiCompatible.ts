import type {
  ModelProvider,
  ProviderRequest,
  ProviderResponse,
  ProviderStreamEvent
} from './base.js';
import type { AgentMessage } from '../types/agentMessages.js';
import type { ProviderToolCall } from '../types/provider.js';

type OpenAIMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string; tool_calls?: unknown[] }
  | { role: 'tool'; tool_call_id: string; content: string };

function toOpenAIMessages(
  messages: AgentMessage[],
  systemPrompt?: string
): OpenAIMessage[] {
  const output: OpenAIMessage[] = [];

  if (systemPrompt) {
    output.push({ role: 'system', content: systemPrompt });
  }

  for (const message of messages) {
    switch (message.role) {
      case 'system':
      case 'user':
      case 'assistant':
        output.push({ role: message.role, content: message.content });
        break;
      case 'tool_call':
        output.push({
          role: 'assistant',
          content: '',
          tool_calls: [
            {
              id: message.id,
              type: 'function',
              function: {
                name: message.toolName,
                arguments: JSON.stringify(message.args ?? {})
              }
            }
          ]
        });
        break;
      case 'tool_result':
        output.push({
          role: 'tool',
          tool_call_id: message.id,
          content: JSON.stringify(message.result ?? {})
        });
        break;
      default:
        break;
    }
  }

  return output;
}

function parseToolCalls(raw: unknown): ProviderToolCall[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((item, idx) => {
    const tool = item as {
      id?: string;
      function?: { name?: string; arguments?: string };
    };
    let args: Record<string, unknown> = {};
    try {
      args = tool.function?.arguments ? (JSON.parse(tool.function.arguments) as Record<string, unknown>) : {};
    } catch {
      args = {};
    }
    return {
      id: tool.id ?? `call_${idx}`,
      name: tool.function?.name ?? 'unknown_tool',
      args
    };
  });
}

export class OpenAICompatibleProvider implements ModelProvider {
  name = 'openai-compatible';

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string | undefined
  ) {}

  async createResponse(input: ProviderRequest): Promise<ProviderResponse> {
    if (!this.apiKey) {
      return {
        text: '未配置 MODEL_API_KEY，当前返回本地回退响应。',
        stopReason: 'final'
      };
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: input.model,
        messages: toOpenAIMessages(input.messages, input.systemPrompt),
        tools: input.tools?.map((tool) => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema
          }
        })),
        tool_choice: input.tools?.length ? 'auto' : undefined
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Provider request failed: ${response.status} ${detail}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{
        finish_reason?: string;
        message?: { content?: string; tool_calls?: unknown[] };
      }>;
    };

    const choice = json.choices?.[0];
    const toolCalls = parseToolCalls(choice?.message?.tool_calls ?? []);
    return {
      text: choice?.message?.content ?? '',
      toolCalls,
      stopReason:
        choice?.finish_reason === 'tool_calls' || toolCalls.length > 0 ? 'tool_calls' : 'final'
    };
  }

  async *streamResponse(input: ProviderRequest): AsyncIterable<ProviderStreamEvent> {
    if (!this.apiKey) {
      yield { type: 'text', chunk: '未配置 MODEL_API_KEY，当前返回本地回退响应。' };
      yield { type: 'done' };
      return;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: input.model,
        messages: toOpenAIMessages(input.messages, input.systemPrompt),
        tools: input.tools?.map((tool) => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema
          }
        })),
        tool_choice: input.tools?.length ? 'auto' : undefined,
        stream: true
      })
    });

    if (!response.ok || !response.body) {
      const detail = await response.text();
      throw new Error(`Provider stream failed: ${response.status} ${detail}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) {
          continue;
        }
        const payload = line.slice('data:'.length).trim();
        if (payload === '[DONE]') {
          yield { type: 'done' };
          return;
        }
        try {
          const json = JSON.parse(payload) as {
            choices?: Array<{
              delta?: {
                content?: string;
                tool_calls?: Array<{
                  index?: number;
                  id?: string;
                  function?: { name?: string; arguments?: string };
                }>;
              };
            }>;
          };
          const delta = json.choices?.[0]?.delta;
          if (delta?.content) {
            yield { type: 'text', chunk: delta.content };
          }
          if (Array.isArray(delta?.tool_calls)) {
            for (const tc of delta.tool_calls) {
              yield {
                type: 'tool_call_delta',
                index: tc.index ?? 0,
                id: tc.id,
                name: tc.function?.name,
                argumentsChunk: tc.function?.arguments
              };
            }
          }
        } catch {
          continue;
        }
      }
    }

    yield { type: 'done' };
  }
}

