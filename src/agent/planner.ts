import type { AgentPlan } from '../types/agent.js';

export function createPlan(userInput: string): AgentPlan {
  const trimmed = userInput.trim();
  if (trimmed.startsWith('/feature')) {
    return {
      mode: 'feature-dev',
      phases: [
        'discovery',
        'exploration',
        'clarification',
        'architecture',
        'approval',
        'implementation',
        'review',
        'summary'
      ]
    };
  }
  if (trimmed.startsWith('/review')) {
    return { mode: 'review', phases: [] };
  }
  if (trimmed.startsWith('/patch')) {
    return { mode: 'patch', phases: [] };
  }
  return { mode: 'normal', phases: [] };
}

