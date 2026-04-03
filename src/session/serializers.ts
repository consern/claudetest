import type { ChatMessage } from '../types/message.js';

export function toTranscript(messages: ChatMessage[]): string {
  return messages.map((m) => `${m.role}: ${m.content}`).join('\n');
}

