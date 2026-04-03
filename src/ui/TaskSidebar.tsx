import React from 'react';
import { Box, Text } from 'ink';
import type { TaskRecord } from '../types/workbench.js';

export interface TaskSidebarProps {
  projectName: string;
  sessionId: string;
  tasks: TaskRecord[];
}

export function TaskSidebar({ projectName, sessionId, tasks }: TaskSidebarProps): React.JSX.Element {
  return (
    <Box flexDirection='column' borderStyle='round' borderColor='white' paddingX={1} width={38}>
      <Text color='cyan'>Tasks</Text>
      <Text dimColor>Project: {projectName}</Text>
      <Text dimColor>Session: {sessionId.slice(0, 8)}</Text>
      {tasks.length === 0 ? <Text dimColor>No tasks yet</Text> : null}
      {tasks.slice(0, 8).map((task) => (
        <Text key={task.id}>
          - {task.title.slice(0, 18)} | {task.mode} | {task.status}
        </Text>
      ))}
    </Box>
  );
}

