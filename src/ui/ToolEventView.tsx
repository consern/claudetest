import React from 'react';
import { Box, Text } from 'ink';

export interface ToolEventViewProps {
  events: string[];
}

export function ToolEventView({ events }: ToolEventViewProps): React.JSX.Element {
  if (events.length === 0) {
    return <Text dimColor>无工具事件</Text>;
  }

  return (
    <Box flexDirection='column'>
      {events.map((event, idx) => (
        <Text key={`${event}-${idx}`} color='blue'>
          tool: {event}
        </Text>
      ))}
    </Box>
  );
}

