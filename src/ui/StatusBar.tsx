import React from 'react';
import { Box, Text } from 'ink';

export interface StatusBarProps {
  provider: string;
  model: string;
  cwd: string;
  sessionId: string;
  streaming: boolean;
}

export function StatusBar(props: StatusBarProps): React.JSX.Element {
  return (
    <Box>
      <Text color='cyan'>provider={props.provider}</Text>
      <Text> | model={props.model}</Text>
      <Text> | cwd={props.cwd}</Text>
      <Text> | session={props.sessionId}</Text>
      <Text> | streaming={String(props.streaming)}</Text>
    </Box>
  );
}

