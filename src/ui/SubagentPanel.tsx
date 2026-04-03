import React from 'react';
import { Box, Text } from 'ink';

export interface SubagentPanelProps {
  activeSubagent?: string;
}

export function SubagentPanel({ activeSubagent }: SubagentPanelProps): React.JSX.Element {
  return (
    <Box>
      <Text color='magenta'>Subagent: {activeSubagent ?? 'none'}</Text>
    </Box>
  );
}

