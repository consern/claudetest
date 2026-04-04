# Current Status

- 阶段：Desktop phase-3 持续迭代中（已完成启动链路统一、核心页面产品化增强、事件流主导基础落地）。
- 分支：`codex/terminal-client-mvp`
- 最新已推送提交：`ab1e8a0`
- 本地未提交改动：
  - `desktop/app/src/pages/TaskWorkspacePage.tsx`（移除事件重要刷新中的 `refreshAll()`；审批回调改为局部刷新）
  - `desktop/app/src/pages/ReviewWorkspacePage.tsx`（审批回调改为局部刷新）
  - `desktop/app/src/store/taskStore.ts`（新增 `refreshApprovals()`）
- 当前构建/测试状态：
  - `pnpm -s build` 通过
  - `pnpm -s test` 通过（16/16）
  - `pnpm build:desktop` 通过
- 实时更新机制状态：
  - Task/Review 页面已接入统一 `eventStore`
  - stream health 可见
  - fallback polling 已按错误状态触发
