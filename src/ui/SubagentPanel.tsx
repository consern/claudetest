import React from 'react';
import { Box, Text } from 'ink';
import type { FeatureDevState } from '../types/workflow.js';

export interface SubagentPanelProps {
  activeSubagent?: string;
  workflowState?: FeatureDevState;
}

export function SubagentPanel({
  activeSubagent,
  workflowState
}: SubagentPanelProps): React.JSX.Element {
  const rows = workflowState?.subagentStatus ?? [];
  return (
    <Box flexDirection='column'>
      <Text color='magenta'>Subagents (active: {activeSubagent ?? 'none'})</Text>
      {rows.length === 0 ? <Text dimColor>No subagent reports yet</Text> : null}
      {rows.slice(0, 6).map((row, idx) => (
        <Text key={`${row.role}-${idx}`}>
          - {row.role} | {row.status} | conf={Math.round((row.confidence ?? 0) * 100)}% |{' '}
          {row.summary.slice(0, 80)}
        </Text>
      ))}
    </Box>
  );
}

