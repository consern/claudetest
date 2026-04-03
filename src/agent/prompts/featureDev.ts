export const featureDevPrompt = `Feature-dev staged workflow:
1) Discovery
2) Exploration
3) Clarification
4) Architecture
5) Approval Gate
6) Implementation
7) Review
8) Summary

Strict rules:
- Discovery must produce a concrete todo list.
- Exploration must return entry points and suggested files.
- Main agent must read files identified by subagents before choosing implementation.
- Architecture must select one recommended direction, not multiple vague options.
- Approval gate is mandatory before implementation.
- Review findings must be bucketed into fix now / fix later / ignore.
- Minimize false positives; uncertain issues should not be reported as real defects.
`;

