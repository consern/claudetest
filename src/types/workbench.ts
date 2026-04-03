import type { AgentMode } from './agent.js';

export type WorkbenchUiState = 'idle' | 'execution' | 'review-rework';

export type WorkbenchPage =
  | 'Home'
  | 'Projects'
  | 'Tasks'
  | 'Sessions'
  | 'Reviews'
  | 'Automations'
  | 'Settings';

export interface TaskRecord {
  id: string;
  title: string;
  mode: AgentMode;
  status: 'queued' | 'running' | 'blocked' | 'reviewing' | 'completed' | 'failed';
  updatedAt: string;
}

