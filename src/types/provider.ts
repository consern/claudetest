import type { ChatMessage } from '../types/message.js';

export interface ProviderRequest {
  model: string;
  systemPrompt?: string;
  messages: ChatMessage[];
}

export interface ProviderResponse {
  text: string;
}

export interface ProviderStreamEvent {
  chunk: string;
}

export interface ModelProvider {
  name: string;
  createResponse(input: ProviderRequest): Promise<ProviderResponse>;
  streamResponse?(input: ProviderRequest): AsyncIterable<ProviderStreamEvent>;
}

