import React from 'react';
import { Box, Text } from 'ink';
import type { FeatureDevState } from '../types/workflow.js';

export interface ImplementationStepsPanelProps {
  workflowState?: FeatureDevState;
}

export function ImplementationStepsPanel({
  workflowState
}: ImplementationStepsPanelProps): React.JSX.Element {
  const steps = workflowState?.selectedPlan?.implementationSteps ?? [];
  const results = workflowState?.stepExecutionResults ?? [];
  return (
    <Box flexDirection='column' borderStyle='round' borderColor='gray' paddingX={1}>
      <Text color='cyan'>Implementation Steps</Text>
      {steps.length === 0 ? <Text dimColor>No implementation steps yet</Text> : null}
      {steps.slice(0, 6).map((step) => {
        const result = results.find((r) => r.stepId === step.id);
        return (
          <Box key={step.id} flexDirection='column'>
            <Text>
              - {step.id} | {step.status}
            </Text>
            <Text dimColor>  {step.description.slice(0, 60)}</Text>
            <Text dimColor>
              {' '}
              files: {step.targetFiles.join(', ') || 'none'}
            </Text>
            {result ? (
              <Text dimColor>
                {' '}
                writes={result.writesApplied}/{result.patchesProposed}
              </Text>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}

