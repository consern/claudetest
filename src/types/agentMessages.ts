export type AgentMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string }
  | { role: 'tool_call'; toolName: string; args: unknown; id: string }
  | { role: 'tool_result'; toolName: string; id: string; result: unknown };

