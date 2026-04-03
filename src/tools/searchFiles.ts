import fg from 'fast-glob';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface SearchFilesInput {
  query: string;
  rootDir: string;
  glob?: string;
}

export interface SearchMatch {
  path: string;
  snippet: string;
}

export async function searchFilesTool(input: SearchFilesInput): Promise<SearchMatch[]> {
  const pattern = input.glob ?? '**/*.{ts,tsx,js,jsx,md,json,yml,yaml}';
  const files = await fg(pattern, {
    cwd: input.rootDir,
    absolute: true,
    dot: true,
    onlyFiles: true,
    ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**']
  });

  const matches: SearchMatch[] = [];

  for (const file of files) {
    const content = await readFile(file, 'utf8').catch(() => '');
    const idx = content.indexOf(input.query);
    if (idx >= 0) {
      const start = Math.max(0, idx - 80);
      const end = Math.min(content.length, idx + input.query.length + 80);
      matches.push({ path: join(file), snippet: content.slice(start, end).replace(/\s+/g, ' ') });
    }
    if (matches.length >= 30) {
      break;
    }
  }

  return matches;
}

