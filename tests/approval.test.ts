import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeFileTool } from '../src/tools/writeFile.js';
import { execShellTool } from '../src/tools/execShell.js';
import type { ToolContext } from '../src/tools/types.js';

test('write_file requires approval', async () => {
  const root = await mkdtemp(join(tmpdir(), 'claudetest-'));
  const target = join(root, 'a.txt');

  const ctx: ToolContext = {
    approval: {
      requestApproval: async () => false
    },
    workspaceRoot: root,
    readMaxBytes: 10000,
    shellEnabled: true,
    writeEnabled: true
  };

  const out = await writeFileTool({ filePath: target, newContent: 'hello' }, ctx);
  assert.equal(out.ok, false);

  const content = await readFile(target, 'utf8').catch(() => '');
  assert.equal(content, '');
});

test('dangerous shell command requires stronger approval', async () => {
  let calls = 0;
  const ctx: ToolContext = {
    approval: {
      requestApproval: async () => {
        calls += 1;
        return false;
      }
    },
    workspaceRoot: process.cwd(),
    readMaxBytes: 10000,
    shellEnabled: true,
    writeEnabled: true
  };

  const out = await execShellTool({ command: 'rm -rf test' }, ctx);
  assert.equal(out.ok, false);
  assert.ok(calls >= 1);
});
