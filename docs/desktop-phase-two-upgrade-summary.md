# Desktop Phase Two Upgrade Summary

## Current Phase-One Baseline
- Desktop shell scaffold exists (`desktop/app`, `desktop/tauri`)
- Home / Task / Review pages exist
- Local service bridge exists in `src/service`
- Frontend already reads core workbench APIs

## Phase-Two Focus
1. Startup flow should feel like one product command, not multiple manual processes.
2. Home should be calmer and more task-focused.
3. Task workspace should emphasize current action, blocked reasons, and execution hierarchy.
4. Review workspace should be decision-oriented with selected finding dominance and lifecycle clarity.
5. Key runtime updates should move from pure polling to event streams.

## Implemented in This Iteration
- Unified startup command: `pnpm dev:desktop`
- SSE task streams added on the service side:
  - `GET /api/tasks/:id/events`
  - `GET /api/tasks/:id/approvals/stream`
  - `GET /api/tasks/:id/audit/stream`
- Frontend EventSource integration for task/review pages (with polling fallback)
- Home composer upgraded with stronger focus and quick-action presets
- Task workspace upgraded with stronger thread hierarchy and action panel emphasis
- Review workspace upgraded with selected-finding focus and lifecycle grouping

## Architecture Notes
- Existing workflow and agent core logic remain unchanged.
- Service layer now includes stream broadcasting for telemetry/tool/audit/approval events.
- Frontend keeps modular API clients and store-based state updates.

