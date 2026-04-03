import type { ModelProvider, ProviderRequest, ProviderResponse } from './base.js';

export class AnthropicCompatibleProvider implements ModelProvider {
  name = 'anthropic-compatible';

  async createResponse(input: ProviderRequest): Promise<ProviderResponse> {
    return {
      text: `[anthropic-compatible placeholder] 收到 ${input.messages.length} 条消息。`
    };
  }
}

