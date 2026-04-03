import React from 'react';
import { Box, Text } from 'ink';
import type { FeatureDevPhase } from '../types/agent.js';

export interface PhaseTrackerProps {
  currentPhase?: FeatureDevPhase;
  phaseStatus?: Partial<Record<FeatureDevPhase, 'pending' | 'active' | 'done' | 'blocked'>>;
  blockedReason?: string;
  inRework?: boolean;
}

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

function stylePhase(phase: FeatureDevPhase, status: string | undefined, currentPhase?: string): string {
  if (status === 'blocked') {
    return `${phase}:blocked`;
  }
  if (status === 'done') {
    return `${phase}:done`;
  }
  if (status === 'active' || phase === currentPhase) {
    return `[${phase}:active]`;
  }
  return `${phase}:pending`;
}

export function PhaseTracker({
  currentPhase,
  phaseStatus,
  blockedReason,
  inRework
}: PhaseTrackerProps): React.JSX.Element {
  const labels = [
    ...phases.map((phase) => stylePhase(phase, phaseStatus?.[phase], currentPhase)),
    inRework ? '[rework:active]' : 'rework:pending'
  ];
  return (
    <Box flexDirection='column'>
      <Text color='cyan'>Phase Tracker</Text>
      <Text>{labels.join(' -> ')}</Text>
      {blockedReason ? <Text color='red'>Blocked Reason: {blockedReason}</Text> : null}
    </Box>
  );
}
