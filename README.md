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

## 安装与运行
```bash
pnpm install
cp .env.example .env
pnpm dev
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

## Roadmap
1. 真正的多 provider streaming
2. 真正的子代理进程并行
3. 更完整的 tool schema 与调用协议
4. 更细粒度审批策略与权限模型
5. 完整测试覆盖

