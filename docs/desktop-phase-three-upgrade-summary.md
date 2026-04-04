# Desktop Phase 3 Upgrade Summary

This document tracks phase-three upgrades for the desktop workbench.

## Baseline (from phase 2)
- Tauri shell exists and can host desktop web app.
- React desktop app has Home / Task Workspace / Review Workspace / Settings pages.
- Service API powers projects, tasks, approvals, reviews, telemetry, and audit.
- Task runtime and review lifecycle are already represented in frontend stores.

## Phase 3 upgrades completed

### 1) Startup flow unification
- Added unified root scripts:
  - `pnpm desktop:dev`
  - `pnpm desktop:build`
  - `pnpm desktop:preview`
  - `pnpm desktop:run` (alias to preview)
- Updated README to make desktop startup path explicit and predictable.

### 2) Home page productization
- Home composer remains the primary visual entry.
- Quick actions and startup note areas are tuned to reduce noise while preserving utility.

### 3) Task Workspace cockpit focus
- `CurrentActionPanel` reinforced with:
  - blocked reason
  - approval-required state
  - current step/tool context
  - last action summary
- Main thread hierarchy clarified for user/assistant/tool/approval contexts.

### 4) Review Workspace decision focus
- Selected finding is treated as dominant decision context.
- Lifecycle visibility improved (`open`, `in_rework`, `resolved`, `dropped`).
- Rework trigger and finding context remain directly actionable.

### 5) Event streams as primary update channel
- Service emits typed stream events across runtime transitions.
- SSE endpoints include task events, approvals stream, and audit stream.
- Frontend now uses a dedicated `eventStore` for:
  - stream lifecycle/health
  - fallback polling gating
  - centralized stream startup/cleanup
- Polling remains fallback only when stream health degrades.

## Validation checklist
- Root build/test passes.
- Desktop web build passes.
- Task and Review pages both render with stream health + fallback polling state.
- Desktop commands are documented and runnable from repository root.
