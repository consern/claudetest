import type { ModelProvider, ProviderRequest, ProviderResponse } from './base.js';

export class GeminiCompatibleProvider implements ModelProvider {
  name = 'gemini-compatible';

  async createResponse(input: ProviderRequest): Promise<ProviderResponse> {
    return {
      text: `[gemini-compatible placeholder] 收到 ${input.messages.length} 条消息。`
    };
  }
}

