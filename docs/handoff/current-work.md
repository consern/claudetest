# Current Work Handoff

## 1) 当前总目标
- 将 `terminal-coding-client` 的 Desktop Workbench 从 phase-2 原型持续迭代到 phase-3：启动链路统一、Home/Task/Review 产品化、SSE 事件流主导更新、polling 仅兜底。

## 2) 当前子目标
- 继续 phase-3 的“事件流主导 + 审计与决策面板可追踪”收尾，提升 Review Workspace 的可决策性与可维护性。

## 3) 已完成内容
- Desktop 启动命令统一并文档化：
  - `pnpm desktop:dev`
  - `pnpm desktop:build`
  - `pnpm desktop:preview`
  - `pnpm desktop:run`
- Task 与 Review 页面均接入统一事件层（`eventStore`），支持 stream health 与 fallback polling。
- 新增/完善 SSE 相关事件处理：
  - `task_state`
  - `telemetry`
  - `tool_event`
  - `audit_event`
  - `approval_added`
  - `approval_resolved`
  - `review_rework`
- 抽离前端事件 reducer（纯函数），并补充单元测试。
- `AuditTimelineView` 改为优先展示真实 `runtime.audit`，并支持 selected finding 相关高亮。
- 本轮优化（2026-04-04）：
  - `TaskWorkspacePage` 在 `onImportantRefresh` 中移除 `refreshAll()`，保留 `refreshTaskRuntime(currentTaskId)`。
  - 目标是减少审批流等高频事件触发后的全量刷新，降低冗余请求与状态抖动风险。
  - `fallback polling` 分支仍保留 `refreshTaskRuntime + refreshAll` 作为降级兜底，不改变故障恢复策略。
- 本轮继续优化（2026-04-04）：
  - `taskStore` 新增 `refreshApprovals()`，用于仅刷新审批队列。
  - Task/Review 页面的 `ApprovalQueue onChanged` 从 `refreshAll()` 收敛为 `refreshApprovals()`。
  - 目标是减少“审批按钮操作 -> 全量刷新”的冗余调用，保持审批动作局部闭环。
- 本轮继续优化（2026-04-04，第二轮）：
  - `taskStore` 新增 `refreshReviews()`，用于仅刷新 review 列表。
  - `ReviewWorkspacePage` 在 fallback polling 时由 `refreshAll()` 收敛为：
    - `refreshTaskRuntime(currentTaskId)`
    - `refreshReviews()`
    - `refreshApprovals()`
  - `Trigger Rework` 后刷新由 `refreshAll()` 收敛为 `refreshReviews() + refreshTaskRuntime(currentTaskId)`。
  - 目标是进一步减少 Review 页“轮询/动作触发 -> 全量刷新”的依赖面。
- 本轮继续优化（2026-04-04，第三轮）：
  - 新增 `desktop/app/src/store/runtimeSelectors.ts`，提供：
    - `selectExecutionSummary`
    - `selectBlockerSummary`
    - `selectReviewSummary`
    - `selectRealtimeSummary`
  - `CurrentActionPanel` 改为消费执行/阻塞摘要语义，新增主摘要与 `Requires Attention` 展示，降低直接拼 telemetry 字段的耦合。
  - 新增 `tests/runtimeSelectors.test.ts`，覆盖审批阻塞、运行态、review 汇总与 realtime 退化场景。
  - 目标是先落地 phase-4 的“事件语义产品化 v1”最小闭环。

## 4) 关键架构决定
- 前端采用“统一事件层 + store 路由”的模式：
  - `eventStore` 负责 SSE 生命周期、健康状态、fallback 策略。
  - `taskStore` 负责业务状态落地（runtime、approvals、lastEventTs）。
- 实时更新策略：
  - stream 正常时，polling 降级或停用；
  - stream 异常时，fallback polling 自动启用。
- Review 决策面板保持“selected finding 为主焦点”的信息层次，不回退为平铺列表。

## 5) 当前状态
- 代码已推送到 `origin/codex/terminal-client-mvp`，最新提交：`89e3a66`。
- 工作区当前存在未提交改动：
  - `desktop/app/src/components/CurrentActionPanel.tsx`（消费语义摘要）
  - `desktop/app/src/store/runtimeSelectors.ts`（新增语义选择器）
  - `tests/runtimeSelectors.test.ts`（新增单测）
- 最近一次回归通过：
  - `pnpm -s build`
  - `pnpm -s test`（16/16）
  - `pnpm build:desktop`

## 6) 关键文件路径
- `E:\code\claudetest\desktop\app\src\store\eventStore.ts`
- `E:\code\claudetest\desktop\app\src\store\taskStore.ts`
- `E:\code\claudetest\desktop\app\src\store\eventReducers.ts`
- `E:\code\claudetest\desktop\app\src\pages\TaskWorkspacePage.tsx`
- `E:\code\claudetest\desktop\app\src\pages\ReviewWorkspacePage.tsx`
- `E:\code\claudetest\desktop\app\src\components\AuditTimelineView.tsx`
- `E:\code\claudetest\desktop\app\src\types\workbench.ts`
- `E:\code\claudetest\tests\desktopEventReducers.test.ts`
- `E:\code\claudetest\README.md`
- `E:\code\claudetest\package.json`

## 7) review / rework 当前状态
- 架构层面：Review Workspace 已具备 finding 生命周期展示与 `Trigger Rework` 入口。
- 数据层面：rework 生命周期依赖运行时任务数据，仓库内无固定“当前正在 rework 的单个 finding”快照。
- 可用状态集合：`open / in_rework / resolved / dropped`，已在 UI 生命周期分组中可见。

## 8) 未完成事项
- 为 Desktop UI 增加更系统的页面层测试（除 reducer 之外）：
  - stream 断连/重连
  - fallback polling 切换
  - Review 选择项与审计联动
- 进一步减少“重要事件后整页 refresh”的依赖，扩大增量更新覆盖。
- `src/service` 到 `desktop/app` 的事件 payload schema 仍可继续收敛为更强类型契约。

## 9) 下一步最高优先级
- 增加并落地 Desktop 端“事件流状态机 + 关键页面联动”的 UI 级测试，先覆盖 Task/Review 两页最关键路径。

## 10) 风险、阻塞点、待确认问题
- 风险：
  - SSE 事件语义若继续扩展，前后端 payload 演进可能出现隐式不兼容。
  - 当前仍有局部“事件触发后 refreshAll”的兜底逻辑，可能造成不必要刷新。
- 阻塞点：
  - 无硬阻塞，主要是测试覆盖与类型契约精化的工程工作量。
- 待确认问题：
  - 是否在 phase-3 内引入组件级测试框架（例如 Vitest + RTL）并纳入 CI。
  - 是否将 service 与 desktop 共享事件 schema（单一 source of truth）。
