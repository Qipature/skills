---
name: account-handoff
description: Summarize the current Codex account's recent cross-project conversation history into a Markdown work inheritance file. Use when the user wants to switch accounts, hand work to another Codex account, create an account-level activity summary, or generate/update D:\gptchange\account-handoff.md from recent Codex threads.
---

# Account Handoff

Create an account-level work inheritance document that helps a different Codex account quickly continue the user's work. Prefer project/workspace summaries over per-conversation transcripts.

## Workflow

1. Discover recent account activity.
   - Use `codex_app.list_threads` with `limit: 50` by default.
   - If thread tools are not currently callable, use `tool_search` to find `list_threads` and `read_thread`.
   - If thread tools are unavailable, ask the user for exported conversation records or existing handoff/project docs instead of claiming full account access.

2. Select threads to inspect.
   - Group listed threads by `cwd`, project, repository, or title pattern.
   - Prioritize active/idle recent threads, pinned or clearly project-related threads, and threads whose previews mention implementation, setup, bugs, publishing, planning, or skill creation.
   - Use `codex_app.read_thread` selectively for representative or important threads. Do not read every thread unless the user asks for exhaustive coverage.
   - Read enough turns to recover goals, outcomes, blockers, paths, and next steps. Include command outputs only when needed.

3. Synthesize by project.
   - Summarize what the account has mainly been doing across projects, not every message.
   - Distinguish completed work, in-progress work, stalled work, decisions already made, and likely next actions.
   - Preserve useful local paths, repository names, thread titles, issue/PR links, and generated artifact paths when they help continuation.
   - Mark uncertain conclusions as inferred from thread titles/previews/summaries.

4. Redact sensitive content.
   - Redact API keys, tokens, passwords, cookies, private keys, session IDs, full secrets, and private credentials.
   - Avoid copying long private conversation passages.
   - Keep enough non-sensitive context for a new account to continue productively.

5. Write the handoff file.
   - Default output directory: `D:\gptchange`.
   - Default output file: `D:\gptchange\account-handoff.md`.
   - Create the directory if it does not exist.
   - Overwrite the existing file with the latest version.
   - If filesystem permissions block writing to `D:\gptchange`, request the needed permission and retry.

## Output Format

Write the Markdown in Chinese unless the user requests another language.

Use this structure:

```markdown
# 账号工作继承档案

生成时间：YYYY-MM-DD HH:mm 时区
数据范围：最近 50 条 Codex 线程；实际精读 N 条代表性线程

## 总体画像
- 这个账号近期主要在做什么。
- 常见项目类型、工具链、偏好和协作方式。

## 主要项目与进展
### 项目/工作区名称
- 路径/仓库：
- 当前目标：
- 已完成：
- 进行中：
- 关键文件/文档/线程：
- 风险或阻塞：

## 未完成事项
- 按优先级列出新账号最应该接手的事项。

## 关键决策与偏好
- 已确认的技术/流程/输出偏好。
- 用户明确要求长期沿用的习惯。

## 重要路径/仓库/文档
- 可帮助新账号快速定位工作的路径、仓库、文档和产物。

## 建议新账号下一步
1. 第一件应该检查或执行的事。
2. 第二件应该检查或执行的事。
3. 第三件应该检查或执行的事。

## 脱敏说明
- 说明已默认脱敏的内容类型。
- 说明哪些结论来自可见线程摘要，可能需要新账号复核。
```

## Quality Bar

- Do not make the file a chronological chat log.
- Do not overfit to the current thread if broader thread history is available.
- Do not invent exact completion status when only a preview was inspected.
- Prefer concise, actionable bullets that a new account can use immediately.
- Mention any major gaps in available history or unread threads.
