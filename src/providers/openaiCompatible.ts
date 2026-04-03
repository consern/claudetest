import type { ModelProvider, ProviderRequest, ProviderResponse } from './base.js';

export class OpenAICompatibleProvider implements ModelProvider {
  name = 'openai-compatible';

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string | undefined
  ) {}

  async createResponse(input: ProviderRequest): Promise<ProviderResponse> {
    if (!this.apiKey) {
      return {
        text: '未配置 MODEL_API_KEY，当前返回本地回退响应。'
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
        messages: [
          ...(input.systemPrompt
            ? [{ role: 'system', content: input.systemPrompt }]
            : []),
          ...input.messages.map((m) => ({ role: m.role, content: m.content }))
        ]
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Provider request failed: ${response.status} ${detail}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return {
      text: json.choices?.[0]?.message?.content ?? ''
    };
  }
}

