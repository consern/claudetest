import type { ChatMessage } from '../types/message.js';

export function appendHistory(messages: ChatMessage[], next: ChatMessage): ChatMessage[] {
  return [...messages, next];
}

