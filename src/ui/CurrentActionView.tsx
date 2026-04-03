import React from 'react';
import { Box, Text } from 'ink';

export interface CurrentActionViewProps {
  currentToolCall?: string;
  loopRound: number;
  maxIterations: number;
}

export function CurrentActionView(props: CurrentActionViewProps): React.JSX.Element {
  return (
    <Box flexDirection='column'>
      <Text color='yellow'>
        Loop: {props.loopRound}/{props.maxIterations}
      </Text>
      <Text>Current Tool Call: {props.currentToolCall ?? 'none'}</Text>
    </Box>
  );
}

