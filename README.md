# Qipature Skills

这是个人 Codex / coding agent 技能仓库，用来沉淀可重复使用的工作流。目前包含 Notion 周报、QQ 作业评分、ETMS APP bug 修复等 skill。仓库结构参考常见 skills 仓库：每个 skill 都放在 `skills/<分类>/<skill>/SKILL.md`，相关脚本、说明和 agent 配置放在同一目录下。

## 安装方式

使用 skills installer 安装：

```bash
npx skills@latest add Qipature/skills
```

安装后按需选择要启用的 skill。

## Skills

### Productivity

- [account-handoff](./skills/productivity/account-handoff/SKILL.md) - 汇总最近跨项目 Codex 账号活动，生成账号切换和上下文交接用的 Markdown 文件。
- [etms-app-debug](./skills/productivity/etms-app-debug/SKILL.md) - 更新 ETMS 飞书 bug 表，按可配置的分配编号筛选 APP bug，例如 `28`，修复后在模拟器验证，并提交推送。
- [notion-api-weekly](./skills/productivity/notion-api-weekly/SKILL.md) - 从最近 Codex 工作记录中整理周报条目，并通过 Notion 官方 API 写入周报数据库。

### Teaching

- [qq-homework-grader](./skills/teaching/qq-homework-grader/SKILL.md) - 使用 Computer Use / 虚拟鼠标批改 QQ 群作业，并整理可录入 QQEX / 腾讯文档表格的成绩。

## ETMS App Debug 快速说明

`etms-app-debug` 默认示例使用当前团队的编号 `28`。其他人复用时通常只需要改这些值：

```text
ETMS_APP_ROOT=D:\project\etms-app
ETMS_DOC_ROOT=D:\project\etms\doc
ETMS_BUG_OWNER=28
ETMS_APP_SHEET_ID=XNeO5J
```

更新 bug 表的脚本放在：

```text
skills/productivity/etms-app-debug/scripts/
```

脚本模板需要飞书开放平台密钥和表格 token，但仓库不会提交真实密钥。真实密钥应放在本机环境变量、私有配置文件，或项目私有目录里。

## 维护规则

- 新增自建 skill 时，要放到本仓库。
- 每个 skill 放到最合适的 `skills/<分类>/` 目录下。
- 每个 skill 必须以 `SKILL.md` 作为入口。
- skill 依赖的脚本、说明文档和 agent 配置应一起提交。
- 不要提交 token、账号密钥、真实 Notion database id、学生隐私数据、成绩结果文件、下载的作业、本地日志或机器专属配置。
- 公开示例统一使用 `<notion-integration-token>`、`<database-url-or-id>`、`<feishu-app-secret>` 这类占位符。

## 仓库结构

```text
.
|-- .claude-plugin/
|   `-- plugin.json
|-- skills/
|   |-- productivity/
|   |   |-- account-handoff/
|   |   |-- etms-app-debug/
|   |   `-- notion-api-weekly/
|   `-- teaching/
|       `-- qq-homework-grader/
|-- LICENSE
`-- README.md
```

## License

MIT
