# notion-api-weekly

把近期 agent/Codex 工作整理成逐条周报任务，并通过 Notion 官方 API 上传到团队周报数据库。

周报生成时应先按系统和实际工作主题归并，不建议把每个对话窗口、工具调用、文档查询或学习步骤都作为独立任务上传。正常一周通常控制在 5-8 条左右；任务字段写具体工作内容，备注默认留空。

这个 skill 分成两层：

- `SKILL.md`: 给 Codex 这类 agent 看的工作流说明，负责判断哪些对话该进周报、怎么分类。
- `scripts/upload_rows.mjs`: 普通 Node.js 上传脚本。只要能生成规定 JSON，Codex 以外的 agent 也能调用它上传。

## 目录结构

```text
notion-api-weekly/
  SKILL.md
  README.md
  scripts/
    upload_rows.mjs
```

## 每个人本机需要配置什么

Windows PowerShell:

```powershell
[Environment]::SetEnvironmentVariable("NOTION_TOKEN", "<notion-integration-token>", "User")
[Environment]::SetEnvironmentVariable("NOTION_WEEKLY_DATABASE", "<notion-database-url-or-id>", "User")
[Environment]::SetEnvironmentVariable("NOTION_WEEKLY_OWNER", "<notion-user-id>", "User")
```

设置后建议重开 PowerShell / Codex / agent 会话。

不要把 `NOTION_TOKEN` 写进仓库、skill、README、聊天记录或日志。每个人用自己的本机环境变量保存。

## Notion integration 权限

Notion integration 至少需要：

- Read content
- Insert content
- Update content

还要在 Notion 页面或数据库里把目标周报库 share 给这个 integration。只有 token 不够；没有数据库访问权限时 API 会返回 404。

## 获取 NOTION_WEEKLY_OWNER

Notion 的 People 字段必须写入 user id。邮箱或显示名只有在 integration 的 `/v1/users` 能看到该用户时才可用于匹配。

推荐流程：

1. 在周报数据库里建一条临时记录。
2. 在 `负责人` 字段手动选择自己。
3. 用 API 读取这条记录，取 `properties.负责人.people[0].id`。
4. 保存到本机：

```powershell
[Environment]::SetEnvironmentVariable("NOTION_WEEKLY_OWNER", "<copied-user-id>", "User")
```

如果 `/v1/users` 能直接列出自己，也可以直接使用返回的 `id`。

## 输入 JSON 格式

```json
{
  "items": [
    {
      "name": "修复 IQTS IDEA Docker 运行配置的 Dockerfile 路径",
      "status": "已完成",
      "system": "IQTS",
      "description": "批量修正 backend/.run 中 11 个运行配置，并验证路径存在。"
    }
  ]
}
```

字段含义：

- `name`: Notion 标题字段，通常对应 `任务`。
- `status`: 必须是数据库已有状态，例如 `已完成`、`下周目标`。
- `system`: 必须是数据库已有 `系统` / `任务类型` 选项，例如 `IQTS`、`ETMS`。
- `description`: 写入 `备注` / `描述` 富文本字段；默认可以留空，只在有关键数字、验收结果、风险说明或用户要求时填写。

脚本会自动填上传时的本地时间到 date 字段。

## 周报归并与分类规则

- 上传前先按系统和工作主题归并，避免把每个聊天窗口或每个执行步骤拆成独立任务。
- `任务` 写最终周报事项，例如 `完善Notion周报自动上传skill及本地配置流程`，不要写成 `获取并梳理 Codex Skills 用法` 这类过程标题。
- `系统` 主要看这件事服务哪个系统，而不是看用了什么工具、查了什么文档、在哪个 agent 里做。
- `ETMS` 当前主要用于 ETMS 相关 bug 修复、Web/后端/导入/活动/公告/学员等功能问题处理，以及服务 ETMS 的工具链工作。
- `IQTS` 当前主要用于 IQTS 开发、重构、环境配置、框架搭建、模块/接口配置，以及服务 IQTS 的 AI 工作流建设。
- AI 学习、Context7 查文档、AGENTS.md/Skills/GSD 研究等不独立分类；归到它服务的系统。例如服务 IQTS 开发流程，就归 `IQTS`。
- 跨系统工具链事项按当前上下文或主要受益系统归类；不确定时先展示草稿让用户确认，不直接上传。

## 上传前 dry-run

先 dry-run 校验数据库字段、状态选项、系统选项和负责人：

```powershell
node .\scripts\upload_rows.mjs --input ".\weekly-rows.json" --dry-run
```

如果不想使用本机默认负责人，可以单次覆盖：

```powershell
node .\scripts\upload_rows.mjs --input ".\weekly-rows.json" --owner "<notion-user-id>" --dry-run
```

## 正式上传

```powershell
node .\scripts\upload_rows.mjs --input ".\weekly-rows.json"
```

或单次指定负责人：

```powershell
node .\scripts\upload_rows.mjs --input ".\weekly-rows.json" --owner "<notion-user-id>"
```

如果没有设置 `NOTION_WEEKLY_DATABASE`，也可以显式传数据库：

```powershell
node .\scripts\upload_rows.mjs --database "<database-url-or-id>" --input ".\weekly-rows.json"
```

## 给其他 agent 使用

Codex 桌面端可以用 `list_threads` / `read_thread` 自动读取近期会话，再按 `SKILL.md` 生成 JSON 并上传。

其他 agent 也可以使用，但需要自己完成“读取工作记录并生成 JSON”这一步。只要最后调用同一个脚本即可：

```powershell
node path\to\notion-api-weekly\scripts\upload_rows.mjs --input ".\weekly-rows.json"
```

## 打包分发

把整个目录发给成员即可：

```text
notion-api-weekly/
  SKILL.md
  README.md
  scripts/upload_rows.mjs
```

成员收到后放到自己的 skill 目录，例如：

```text
C:\Users\<name>\.codex\skills\notion-api-weekly
```

然后按本文配置三个环境变量。

## 注意事项

- 脚本只使用数据库已有字段和已有选项，不会主动创建新的系统/状态选项。
- 上传前应先做主题归并，不建议把每个对话窗口都作为独立周报任务。
- 负责人如果写不进去，优先检查 `NOTION_WEEKLY_OWNER` 是否是真实 Notion user id。
- Notion API 和网页 UI 的可见用户范围可能不同；网页能搜到的人，integration token 不一定能通过 `/v1/users` 搜到。
- 上传前一定先跑 `--dry-run`。
