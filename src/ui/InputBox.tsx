import React from 'react';
import { Box, Text } from 'ink';

export interface InputBoxProps {
  value: string;
  disabled?: boolean;
}

export function InputBox({ value, disabled }: InputBoxProps): React.JSX.Element {
  return (
    <Box borderStyle='round' borderColor={disabled ? 'gray' : 'green'} paddingX={1}>
      <Text>{disabled ? '等待确认中...' : '> '}{value}</Text>
    </Box>
  );
}

