import type { AppEnv } from '../config/env.js';
import type { ModelProvider } from './base.js';
import { OpenAICompatibleProvider } from './openaiCompatible.js';
import { AnthropicCompatibleProvider } from './anthropicCompatible.js';
import { GeminiCompatibleProvider } from './geminiCompatible.js';

export function createProvider(env: AppEnv): ModelProvider {
  switch (env.MODEL_PROVIDER) {
    case 'anthropic-compatible':
      return new AnthropicCompatibleProvider();
    case 'gemini-compatible':
      return new GeminiCompatibleProvider();
    case 'openai-compatible':
    default:
      return new OpenAICompatibleProvider(env.MODEL_BASE_URL, env.MODEL_API_KEY);
  }
}

