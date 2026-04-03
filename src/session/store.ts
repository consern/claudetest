import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SessionState } from '../types/session.js';

export async function saveSession(sessionDir: string, state: SessionState): Promise<void> {
  await mkdir(sessionDir, { recursive: true });
  const path = join(sessionDir, `${state.id}.json`);
  await writeFile(path, JSON.stringify(state, null, 2), 'utf8');
}

export async function loadSession(
  sessionDir: string,
  sessionId: string
): Promise<SessionState | null> {
  const path = join(sessionDir, `${sessionId}.json`);
  try {
    const data = await readFile(path, 'utf8');
    return JSON.parse(data) as SessionState;
  } catch {
    return null;
  }
}

