# ETMS App Debug 使用说明

这个 skill 用来处理 ETMS APP 端的飞书 bug 表：拉取 `dev` 分支，更新 bug 表，筛选分配给指定编号的人，修复 APP 端 bug，完成 HBuilderX/模拟器验证，然后提交并推送。

默认示例使用 `28`，也就是当前团队里你的编号。其他人使用时通常只需要改路径和编号。

## 需要先改的配置

```text
ETMS_APP_ROOT=D:\project\etms-app
ETMS_DOC_ROOT=D:\project\etms\doc
ETMS_BUG_OWNER=28
ETMS_APP_SHEET_ID=XNeO5J
ETMS_REMOTE=origin
ETMS_BRANCH=dev
ETMS_BUG_HTML=%ETMS_DOC_ROOT%\bug.html
```

常见修改项：

- `ETMS_APP_ROOT`：APP 仓库路径。
- `ETMS_DOC_ROOT`：存放 `update_bug.bat`、`update_bug_data.js`、`bug.html` 的文档目录。
- `ETMS_BUG_OWNER`：飞书 bug 表里的分配状态编号，例如当前是 `28`。
- `ETMS_APP_SHEET_ID`：APP 验收测试子表 id，当前默认是 `XNeO5J`。

## 更新 bug 表

优先使用项目已有脚本：

```bat
cd /d D:\project\etms\doc
update_bug.bat
```

如果项目里没有脚本，可以使用本 skill 的模板脚本：

```bat
set ETMS_DOC_ROOT=D:\project\etms\doc
set ETMS_BUG_OWNER=28
scripts\update_bug.bat
```

模板脚本需要飞书密钥。密钥不要提交到仓库，建议放在本机环境变量或 `%ETMS_DOC_ROOT%\bug_config.json`。

## 修复流程

1. 在 `ETMS_APP_ROOT` 检查工作区：`git status --short`。
2. 如果有用户未提交改动，先用带时间戳的 `git stash push -u` 保存，不要自动恢复。
3. 拉取目标分支：`git fetch origin --prune`，确认 `origin/dev` 存在后 `git pull --ff-only origin dev`。
4. 运行 bug 表更新脚本，确认 `bug.html` 已更新。
5. 筛选 `解决状态` 为 `待解决`、`解决中`、`后期解决`，并且 `分配状态` 等于 `ETMS_BUG_OWNER` 的记录。
6. 优先处理 APP 子表里的 bug；后端、Web 或当前仓库无法修复的问题要跳过并记录原因。
7. 按现有代码风格做最小范围修复，避免回滚用户改动。
8. 验证：`git diff --check`、`corepack pnpm build:h5`、`corepack pnpm type-check`。
9. 对 APP 行为必须在 HBuilderX/模拟器里走真实路径验证，不只是启动模拟器。
10. 只提交相关源码和 skill/script 文件，推送到 `origin/dev`。

## 模拟器验证要求

如果用户已经在模拟器里登录成功，直接用虚拟鼠标或 adb 输入操作页面。验证重点是 bug 对应的真实路径，例如：

- 个人中心统计。
- 学习档案学习时长。
- 我的证书入口。
- 我的项目入口。
- 直播回放入口和错误提示。

最终汇报要写清楚：验证了哪个页面、点了哪些入口、看到什么结果、还有什么风险。

## 安全注意

- 不要把飞书 `appSecret`、表格 token、群聊 id、cookie、生成的 `bug.html`、截图、视频或本地日志提交到公开仓库。
- `bug_config.json` 只放本机或私有项目目录。
- 缺少 `lark-cli` 或截图下载失败时，不阻断文本筛选，但要在最终报告里说明。