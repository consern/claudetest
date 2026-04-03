import type { ChatMessage } from './message.js';

export interface SessionState {
  id: string;
  cwd: string;
  providerName: string;
  modelName: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

