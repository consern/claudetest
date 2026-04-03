import React from 'react';
import { Box, Text } from 'ink';

export interface HomeComposerProps {
  currentProject: string;
  recentTasks: string[];
  recentSessions: string[];
  input: string;
}

export function HomeComposer(props: HomeComposerProps): React.JSX.Element {
  return (
    <Box flexDirection='column' borderStyle='round' borderColor='cyan' paddingX={1}>
      <Text color='cyan'>Workbench Home</Text>
      <Text>Project: {props.currentProject}</Text>
      <Text dimColor>Describe a task, start a feature workflow, or review recent changes.</Text>
      <Text>
        Quick Actions: [Start Task] [Start Feature Workflow] [Review Changes] [Resume Last Session]
      </Text>
      <Text color='green'>&gt; {props.input || '(input here)'}</Text>
      <Text dimColor>Recent Tasks: {props.recentTasks.join(' | ') || 'none'}</Text>
      <Text dimColor>Recent Sessions: {props.recentSessions.join(' | ') || 'none'}</Text>
    </Box>
  );
}

