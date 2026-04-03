import React from 'react';
import { Box, Text } from 'ink';
import type { ChatMessage } from '../types/message.js';

export interface ChatViewProps {
  messages: ChatMessage[];
}

export function ChatView({ messages }: ChatViewProps): React.JSX.Element {
  return (
    <Box flexDirection='column' borderStyle='round' borderColor='cyan' paddingX={1}>
      {messages.map((m) => (
        <Text key={m.id} color={m.role === 'user' ? 'green' : m.role === 'assistant' ? 'yellow' : 'gray'}>
          [{m.role}] {m.content}
        </Text>
      ))}
    </Box>
  );
}

