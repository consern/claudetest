export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  meta?: Record<string, string>;
}

