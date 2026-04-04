# Desktop Phase One Architecture Summary

## Goal
Move from a terminal-only shell to a desktop-ready workbench architecture without rewriting the existing agent core.

## Core Principle
Keep the current Node/TypeScript agent loop, workflow, providers, tools, approval logic, review/rework, and telemetry intact.  
Add a local service bridge that exposes these capabilities to a desktop UI.

## Runtime Shape
1. Desktop shell (Phase 1 target, Tauri preferred)
2. React + TypeScript UI
3. Local API bridge (Node service in this repo)
4. Existing agent core modules reused by the service

## Phase One UI Scope
1. Home
2. Task Workspace
3. Review / Rework Workspace

## Local Service Bridge
Implemented under `src/service/`:
- `manager.ts`: in-memory task runtime, approval queue, task execution using `runAgentLoop`
- `server.ts`: HTTP routes
- `index.ts`: service entrypoint

### Exposed API Groups
1. Projects
2. Tasks
3. Sessions
4. Reviews / Rework
5. Approvals
6. Task state / telemetry / audit

### Task Execution Path
1. `POST /api/tasks/start`
2. Service creates runtime task
3. Service executes command/agent loop in background
4. UI polls:
   - `/api/tasks/:id/state`
   - `/api/tasks/:id/telemetry`
   - `/api/tasks/:id/audit`
5. Approval requests appear at `/api/approvals`, resolved via approve/reject endpoints

## Why This Phase Is Safe
- No duplication of core agent logic
- Existing tests/build remain valid
- Service layer is additive and can be consumed by desktop shell incrementally

## Next Step
Wire a desktop shell UI (Tauri) to this local service bridge and replace polling with SSE/WS for live updates.

