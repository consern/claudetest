import React from 'react';
import { Box, Text } from 'ink';
import type { FeatureDevState } from '../types/workflow.js';

export interface AuditTimelineViewProps {
  workflowState?: FeatureDevState;
}

export function AuditTimelineView({ workflowState }: AuditTimelineViewProps): React.JSX.Element {
  const events = workflowState?.auditEvents ?? [];
  return (
    <Box flexDirection='column' borderStyle='round' borderColor='blue' paddingX={1}>
      <Text color='cyan'>Audit Timeline</Text>
      {events.length === 0 ? <Text dimColor>No audit events</Text> : null}
      {events.slice(-8).map((event, idx) => (
        <Text key={`${event.timestamp}-${idx}`} dimColor>
          {event.timestamp.slice(11, 19)} {event.eventType} {event.phase ? `[${event.phase}]` : ''}{' '}
          {event.summary.slice(0, 70)}
        </Text>
      ))}
    </Box>
  );
}

