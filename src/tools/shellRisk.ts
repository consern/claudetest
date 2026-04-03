export type ShellRiskLevel = 'safe' | 'review' | 'dangerous';

const safePatterns = [
  /^\s*(ls|dir)(\s|$)/i,
  /^\s*(cat|type)(\s|$)/i,
  /^\s*(pwd|cd)(\s|$)/i,
  /^\s*(git\s+status|git\s+diff)(\s|$)/i,
  /^\s*(pnpm\s+build|npm\s+run\s+build)(\s|$)/i
];

const dangerousPatterns = [
  /\brm\s+-rf\b/i,
  /\bdel\s+\/f\b/i,
  /\brmdir\s+\/s\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bformat\b/i,
  /\bmkfs\b/i
];

const reviewPatterns = [
  /\bpnpm\s+install\b/i,
  /\bnpm\s+install\b/i,
  /\bpnpm\s+add\b/i,
  /\bnpm\s+i\b/i,
  /\bgit\s+push\b/i,
  /\bgit\s+commit\b/i
];

export function classifyShellRisk(command: string): {
  level: ShellRiskLevel;
  reason: string;
} {
  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      return { level: 'dangerous', reason: `命中危险命令模式: ${pattern}` };
    }
  }

  for (const pattern of safePatterns) {
    if (pattern.test(command)) {
      return { level: 'safe', reason: `命中安全命令模式: ${pattern}` };
    }
  }

  for (const pattern of reviewPatterns) {
    if (pattern.test(command)) {
      return { level: 'review', reason: `命中审查命令模式: ${pattern}` };
    }
  }

  return { level: 'review', reason: '默认审查级别命令' };
}

