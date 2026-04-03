import React from 'react';
import { Box, Text } from 'ink';
import type { FeatureDevState } from '../types/workflow.js';
import { DecisionBucketsView } from './DecisionBucketsView.js';
import { AuditTimelineView } from './AuditTimelineView.js';

export interface ReviewReworkWorkspaceProps {
  workflowState?: FeatureDevState;
}

export function ReviewReworkWorkspace({
  workflowState
}: ReviewReworkWorkspaceProps): React.JSX.Element {
  const lifecycle = workflowState?.findingLifecycle ?? [];
  const selected =
    lifecycle.find((item) => item.status === 'in_rework' || item.status === 'open') ?? lifecycle[0];

  return (
    <Box flexDirection='column'>
      <Text color='cyan'>Review / Rework Workspace</Text>
      <Box>
        <Box flexDirection='column' width={46}>
          <DecisionBucketsView workflowState={workflowState} />
          <Box flexDirection='column' borderStyle='round' borderColor='white' paddingX={1}>
            <Text color='cyan'>Finding Lifecycle</Text>
            {lifecycle.length === 0 ? <Text dimColor>No lifecycle rows</Text> : null}
            {lifecycle.slice(0, 8).map((row) => (
              <Text key={row.findingId}>
                - {row.status} | {row.title.slice(0, 30)}
              </Text>
            ))}
          </Box>
        </Box>
        <Box flexDirection='column' width={56} marginLeft={1}>
          <Box flexDirection='column' borderStyle='round' borderColor='yellow' paddingX={1}>
            <Text color='cyan'>Finding Detail</Text>
            {selected ? (
              <>
                <Text>{selected.title}</Text>
                <Text dimColor>status: {selected.status}</Text>
                <Text dimColor>related: {selected.relatedFiles.join(', ') || 'none'}</Text>
                <Text dimColor>steps: {selected.linkedStepIds.join(', ') || 'none'}</Text>
                <Text dimColor>note: {selected.resolutionNote ?? 'none'}</Text>
              </>
            ) : (
              <Text dimColor>No finding selected</Text>
            )}
          </Box>
          <AuditTimelineView workflowState={workflowState} />
        </Box>
      </Box>
    </Box>
  );
}

