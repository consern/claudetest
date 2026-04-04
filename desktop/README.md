# Desktop Shell Launch (Phase 1)

This folder contains the first real desktop shell layer:

- `app/`: React + TypeScript frontend
- `tauri/src-tauri/`: Tauri shell scaffold

## Run frontend

```bash
pnpm --dir desktop/app install
pnpm --dir desktop/app dev
```

## Run local backend bridge

From repository root:

```bash
pnpm dev:service
```

The desktop frontend uses `http://127.0.0.1:4317` for the local Workbench API.

## Phase 1 status

- Home page: implemented
- Task workspace: implemented
- Review workspace: implemented
- API client modules: implemented
- Polling state refresh: implemented (task/review pages)
- Tauri shell: scaffolded

