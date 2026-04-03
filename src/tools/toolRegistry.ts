import { readFileTool } from './readFile.js';
import { searchFilesTool } from './searchFiles.js';
import { previewDiffTool } from './previewDiff.js';
import { writeFileTool } from './writeFile.js';
import { execShellTool } from './execShell.js';

export const toolRegistry = {
  read_file: readFileTool,
  search_files: searchFilesTool,
  preview_diff: previewDiffTool,
  write_file: writeFileTool,
  exec_shell: execShellTool
};

