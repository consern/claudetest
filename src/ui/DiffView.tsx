import React from 'react';
import { Box, Text } from 'ink';

export interface DiffViewProps {
  diff: string;
}

export function DiffView({ diff }: DiffViewProps): React.JSX.Element {
  return (
    <Box borderStyle='round' borderColor='magenta' paddingX={1}>
      <Text>{diff.slice(0, 1000)}</Text>
    </Box>
  );
}

