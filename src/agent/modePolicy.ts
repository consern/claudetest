import type { AgentMode } from '../types/agent.js';
import { selectMainPrompt } from './prompts/main.js';

export interface ModePolicy {
  prompt: string;
  approvalStrictness: 'normal' | 'strict';
  reviewThreshold?: number;
  defaultUiFocus: 'chat' | 'execution' | 'decision';
  preferredTools?: string[];
}

export function getModePolicy(mode: AgentMode): ModePolicy {
  switch (mode) {
    case 'feature-dev':
      return {
        prompt: selectMainPrompt(mode),
        approvalStrictness: 'strict',
        reviewThreshold: 0.8,
        defaultUiFocus: 'execution',
        preferredTools: ['read_file', 'search_files', 'write_file']
      };
    case 'review':
      return {
        prompt: selectMainPrompt(mode),
        approvalStrictness: 'normal',
        reviewThreshold: 0.85,
        defaultUiFocus: 'decision',
        preferredTools: ['read_file', 'search_files']
      };
    case 'patch':
      return {
        prompt: selectMainPrompt(mode),
        approvalStrictness: 'strict',
        defaultUiFocus: 'execution',
        preferredTools: ['read_file', 'preview_diff', 'write_file']
      };
    case 'rework':
      return {
        prompt: selectMainPrompt(mode),
        approvalStrictness: 'strict',
        reviewThreshold: 0.85,
        defaultUiFocus: 'decision',
        preferredTools: ['read_file', 'write_file']
      };
    case 'normal':
    default:
      return {
        prompt: selectMainPrompt('normal'),
        approvalStrictness: 'normal',
        defaultUiFocus: 'chat',
        preferredTools: ['read_file', 'search_files', 'exec_shell']
      };
  }
}

