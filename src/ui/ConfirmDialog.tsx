import React from 'react';
import { Box, Text } from 'ink';
import type { ToolApprovalRequest } from '../types/tool.js';

export interface ConfirmDialogProps {
  request: ToolApprovalRequest;
}

export function ConfirmDialog({ request }: ConfirmDialogProps): React.JSX.Element {
  return (
    <Box flexDirection='column' borderStyle='double' borderColor='yellow' paddingX={1}>
      <Text color='yellow'>[确认请求] {request.title}</Text>
      <Text>{request.detail.slice(0, 600)}</Text>
      <Text color='green'>按 y 同意，按 n 拒绝</Text>
    </Box>
  );
}

