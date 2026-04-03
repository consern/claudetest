import type { AgentMessage } from './agentMessages.js';

export interface ProviderToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ProviderToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ProviderRequest {
  model: string;
  systemPrompt?: string;
  messages: AgentMessage[];
  tools?: ProviderToolDefinition[];
}

export interface ProviderResponse {
  text: string;
  toolCalls?: ProviderToolCall[];
  stopReason?: 'final' | 'tool_calls';
}

export type ProviderStreamEvent =
  | { type: 'text'; chunk: string }
  | {
      type: 'tool_call_delta';
      index: number;
      id?: string;
      name?: string;
      argumentsChunk?: string;
    }
  | { type: 'done' };

export interface ModelProvider {
  name: string;
  createResponse(input: ProviderRequest): Promise<ProviderResponse>;
  streamResponse?(input: ProviderRequest): AsyncIterable<ProviderStreamEvent>;
}

