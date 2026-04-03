export const featureDevPrompt = `Feature-dev execution workflow:
1) Discovery
2) Exploration
3) Clarification
4) Architecture
5) Approval Gate
6) Implementation
7) Review
8) Summary

Execution constraints:
- Discovery must produce concrete todos and assumptions.
- Exploration must identify entry points and files to read.
- Main agent must read files identified by subagents before architecture selection.
- Architecture must choose one recommended direction and convert it into explicit implementation steps.
- Approval gate is mandatory before implementation.
- Implementation must update workflow step status after each step.
- Review findings must be bucketed: fixNow/fixLater/ignore.
- If fixNow exists, workflow should re-enter implementation with explicit rework steps.
- If blocked, return explicit blocked reason and next action.
`;

