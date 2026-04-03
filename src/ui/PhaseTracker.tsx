import React from 'react';
import { Box, Text } from 'ink';
import type { FeatureDevPhase } from '../types/agent.js';

export interface PhaseTrackerProps {
  currentPhase?: FeatureDevPhase;
}

export function PhaseTracker({ currentPhase }: PhaseTrackerProps): React.JSX.Element {
  const phases: FeatureDevPhase[] = [
    'discovery',
    'exploration',
    'clarification',
    'architecture',
    'approval',
    'implementation',
    'review',
    'summary'
  ];

  return (
    <Box flexDirection='column'>
      <Text color='cyan'>Phase Tracker</Text>
      <Text>
        {phases
          .map((phase) => (phase === currentPhase ? `[${phase}]` : phase))
          .join(' -> ')}
      </Text>
    </Box>
  );
}

