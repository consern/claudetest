# Terminal Coding Client

一个终端原生的 AI coding client，参考公开可见的 agent 工作流模式实现（不包含任何专有品牌资产）。

## 设计目标
- 终端优先（CLI/TUI）
- staged workflow（含 feature-dev）
- 主代理 + 子代理角色骨架
- 工具调用审批与安全前置检查
- provider 抽象，避免核心逻辑与单厂商耦合

## 功能
- 多轮会话 + 会话持久化（`.sessions`）
- 文件读取 `read_file`
- 文件搜索 `search_files`
- diff 预览 `preview_diff`
- 写文件前确认 `write_file`
- shell 执行前确认 `exec_shell`
- `feature-dev` 阶段化流程骨架
- `code-explorer` / `code-architect` / `code-reviewer` 子代理骨架
- PreToolUse 风险规则（高风险路径/代码模式）
- 多轮 tool-use agent loop（工具调用结果回注继续推理）
- 工具标准化 schema + 参数校验（zod）
- workspace sandbox（读写与 shell 默认限制在 `WORKSPACE_ROOT`）
- shell 风险分级（safe/review/dangerous）
- provider 流式事件接入与终端增量渲染
- feature-dev 状态控制（`FeatureDevState`、审批闸门、review 分桶）
- 终端过程可视化（phase/subagent/current action/decision buckets）
- 回归测试：sandbox、tool schema、approval、loop smoke、feature workflow

## 安装与运行
```bash
pnpm install
cp .env.example .env
pnpm dev
pnpm dev:service
pnpm test
```

## 本地 Workbench API（Phase 1）
启动：
```bash
pnpm dev:service
```

默认地址：`http://127.0.0.1:4317`

核心接口：
- `GET /api/projects`
- `POST /api/projects/open`
- `GET /api/tasks`
- `POST /api/tasks/start`
- `GET /api/tasks/:id/state`
- `GET /api/tasks/:id/telemetry`
- `GET /api/tasks/:id/audit`
- `GET /api/tasks/:id/events` (SSE)
- `GET /api/tasks/:id/approvals/stream` (SSE)
- `GET /api/tasks/:id/audit/stream` (SSE)
- `GET /api/reviews`
- `POST /api/reviews/:taskId/rework`
- `GET /api/approvals`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`

## Desktop Shell（Phase 1）
已新增桌面壳目录：
- `desktop/app`：React + TypeScript 前端（Home / Tasks / Reviews / Settings）
- `desktop/tauri/src-tauri`：Tauri 壳骨架

一键桌面联调（推荐）：
```bash
pnpm dev:desktop
```

本地联调建议：
1. 首次安装前端依赖：`pnpm --dir desktop/app install`
2. 一键启动：`pnpm dev:desktop`
3. 仅前端调试：`pnpm dev:desktop:web`

前端默认请求本地服务地址：`http://127.0.0.1:4317`

可选：连同 Tauri 壳一起启动（需要本机已安装 tauri/cargo）：
```bash
set DESKTOP_WITH_TAURI=1
pnpm dev:desktop
```

## 环境变量
见 [`.env.example`](/E:/code/claudetest/.env.example)

## Provider 配置
- `openai-compatible`（已实现 HTTP 调用）
- `anthropic-compatible`（占位实现）
- `gemini-compatible`（占位实现）

## 安全说明
- 写文件和 shell 执行必须显式确认
- 命中高风险规则时会触发额外确认
- 工具失败不会被伪装为成功

## 示例
- `/read E:/code/claudetest/README.md`
- `/search feature-dev`
- `/write E:/code/claudetest/tmp.txt::hello`
- `/shell dir`
- `/feature add workspace-aware planner`
- 也可直接自然语言：例如“先搜索 toolRegistry，再读 loop.ts，最后给出重构建议”

## Roadmap
1. 真正的多 provider streaming
2. 真正的子代理进程并行
3. 更完整的 tool schema 与调用协议
4. 更细粒度审批策略与权限模型
5. 完整测试覆盖

