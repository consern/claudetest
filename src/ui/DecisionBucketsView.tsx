import React from 'react';
import { Box, Text } from 'ink';
import type { FeatureDevState, ReviewFinding } from '../types/workflow.js';

export interface DecisionBucketsViewProps {
  workflowState?: FeatureDevState;
}

function renderBucket(title: string, rows: ReviewFinding[]): React.JSX.Element {
  return (
    <Box flexDirection='column'>
      <Text color='green'>
        {title}: {rows.length}
      </Text>
      {rows.slice(0, 5).map((finding, idx) => (
        <Box key={`${title}-${idx}`} flexDirection='column'>
          <Text>
            - {finding.title} [{finding.category}] {Math.round(finding.confidence * 100)}%
          </Text>
          <Text dimColor>  why: {finding.whyItMatters.slice(0, 80)}</Text>
          <Text dimColor>  evidence: {finding.evidence.slice(0, 80)}</Text>
        </Box>
      ))}
      {rows.length > 5 ? <Text dimColor>...and {rows.length - 5} more</Text> : null}
    </Box>
  );
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
      {renderBucket('fix now', workflowState.decisionBuckets.fixNow)}
      {renderBucket('fix later', workflowState.decisionBuckets.fixLater)}
      {renderBucket('ignore', workflowState.decisionBuckets.ignore)}
    </Box>
  );
}
