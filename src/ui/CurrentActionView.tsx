import React from 'react';
import { Box, Text } from 'ink';
import type { FeatureDevPhase } from '../types/agent.js';

export interface CurrentActionViewProps {
  round: number;
  maxIterations: number;
  activePhase?: FeatureDevPhase;
  activeTool?: string;
  activeSubagent?: string;
  activeImplementationStep?: string;
  blockedReason?: string;
}

export function CurrentActionView(props: CurrentActionViewProps): React.JSX.Element {
  return (
    <Box flexDirection='column'>
      <Text color='yellow'>
        Loop Round: {props.round}/{props.maxIterations}
      </Text>
      <Text>Active Phase: {props.activePhase ?? 'none'}</Text>
      <Text>Active Tool: {props.activeTool ?? 'none'}</Text>
      <Text>Active Subagent: {props.activeSubagent ?? 'none'}</Text>
      <Text>Implementation Step: {props.activeImplementationStep ?? 'none'}</Text>
      {props.blockedReason ? <Text color='red'>Blocked: {props.blockedReason}</Text> : null}
    </Box>
  );
}

