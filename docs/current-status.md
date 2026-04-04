# Current Status

- 阶段：Desktop phase-3 持续迭代中（已完成启动链路统一、核心页面产品化增强、事件流主导基础落地）。
- 分支：`codex/terminal-client-mvp`
- 最新已推送提交：`89e3a66`
- 本地未提交改动：
  - `desktop/app/src/components/CurrentActionPanel.tsx`（接入执行/阻塞摘要语义）
  - `desktop/app/src/store/runtimeSelectors.ts`（新增 runtime 语义选择器）
  - `tests/runtimeSelectors.test.ts`（新增选择器单测）
- 当前构建/测试状态：
  - `pnpm -s build` 通过
  - `pnpm -s test` 通过（21/21）
  - `pnpm build:desktop` 通过
- 实时更新机制状态：
  - Task/Review 页面已接入统一 `eventStore`
  - stream health 可见
  - fallback polling 已按错误状态触发
