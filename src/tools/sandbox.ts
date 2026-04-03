import { isAbsolute, normalize, relative, resolve } from 'node:path';

function normalizeForCompare(path: string): string {
  const normalized = normalize(path).replace(/[\\/]+$/, '');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

export function assertPathInWorkspace(absPath: string, workspaceRoot: string): void {
  const normalizedRoot = normalizeForCompare(resolve(workspaceRoot));
  const normalizedPath = normalizeForCompare(resolve(absPath));
  const rel = relative(normalizedRoot, normalizedPath);

  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Path is outside workspace: ${absPath}`);
  }
}

export function resolvePathWithinWorkspace(inputPath: string, workspaceRoot: string): string {
  const absPath = isAbsolute(inputPath)
    ? resolve(inputPath)
    : resolve(workspaceRoot, inputPath);
  assertPathInWorkspace(absPath, workspaceRoot);
  return absPath;
}

