import type { AgentPlan } from '../types/agent.js';

export function createPlan(userInput: string): AgentPlan {
  const isFeatureMode = userInput.startsWith('/feature');

  if (!isFeatureMode) {
    return { mode: 'chat', phases: [] };
  }

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

