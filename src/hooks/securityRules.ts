export const riskyPathPatterns = [/\.github\/workflows\//i];

export const riskyCodePatterns = [
  /\beval\s*\(/,
  /new\s+Function\s*\(/,
  /child_process\.exec\s*\(/,
  /os\.system\s*\(/,
  /pickle\./,
  /document\.write\s*\(/,
  /dangerouslySetInnerHTML/,
  /\binnerHTML\b/
];
