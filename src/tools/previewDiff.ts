import { createTwoFilesPatch } from 'diff';

export interface PreviewDiffInput {
  oldContent: string;
  newContent: string;
  filePath: string;
}

export interface PreviewDiffOutput {
  unifiedDiff: string;
}

export function previewDiffTool(input: PreviewDiffInput): PreviewDiffOutput {
  const unifiedDiff = createTwoFilesPatch(
    input.filePath,
    input.filePath,
    input.oldContent,
    input.newContent,
    'before',
    'after'
  );

  return { unifiedDiff };
}

