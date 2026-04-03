import React from 'react';
import { Box, Text } from 'ink';

export interface ReviewPanelProps {
  lines: string[];
}

export function ReviewPanel({ lines }: ReviewPanelProps): React.JSX.Element {
  return (
    <Box flexDirection='column' borderStyle='round' borderColor='white' paddingX={1}>
      <Text>Quality Review</Text>
      {lines.map((line, i) => (
        <Text key={`${line}-${i}`}>{line}</Text>
      ))}
    </Box>
  );
}

