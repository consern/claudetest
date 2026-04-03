import React from 'react';
import { Box, Text } from 'ink';
import type { FeatureDevState } from '../types/workflow.js';

export interface DecisionBucketsViewProps {
  workflowState?: FeatureDevState;
}

export function DecisionBucketsView({
  workflowState
}: DecisionBucketsViewProps): React.JSX.Element {
  if (!workflowState) {
    return <Text dimColor>No feature-dev decision buckets</Text>;
  }

  return (
    <Box flexDirection='column'>
      <Text color='green'>Decision Buckets</Text>
      <Text>fix now: {workflowState.decisionBuckets.fixNow.length}</Text>
      <Text>fix later: {workflowState.decisionBuckets.fixLater.length}</Text>
      <Text>ignore: {workflowState.decisionBuckets.ignore.length}</Text>
    </Box>
  );
}

