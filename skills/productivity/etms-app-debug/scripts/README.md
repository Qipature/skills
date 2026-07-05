# ETMS Bug 更新脚本说明

这些脚本是 `etms-app-debug` skill 的辅助工具，用来更新飞书 bug 表并生成本地 `bug.html`。仓库里的版本不包含真实密钥，可以公开保存。

## 快速使用

如果你的 ETMS 文档目录里已经有项目自己的 `update_bug_data.js`：

```bat
set ETMS_DOC_ROOT=D:\project\etms\doc
set ETMS_BUG_OWNER=28
update_bug.bat
```

也可以直接把文档目录作为参数传入：

```bat
update_bug.bat D:\project\etms\doc
```

`update_bug.bat` 会优先运行 `%ETMS_DOC_ROOT%\update_bug_data.js`。如果该文件不存在，才会回退到本目录的 `update_bug_data.template.js`。

## 其他人通常只需要改什么

- `ETMS_DOC_ROOT`：文档目录路径，例如 `D:\project\etms\doc`。
- `ETMS_BUG_HTML`：生成的 bug 表路径，例如 `D:\project\etms\doc\bug.html`。
- `ETMS_BUG_OWNER`：自己的分配状态编号，例如当前团队默认是 `28`。
- `ETMS_APP_SHEET_ID`：APP 子表 id，当前默认是 `XNeO5J`。

## 模板脚本需要的密钥

使用 `update_bug_data.template.js` 时，需要提供飞书开放平台和表格信息。推荐使用环境变量：

```bat
set FEISHU_APP_ID=<feishu-app-id>
set FEISHU_APP_SECRET=<feishu-app-secret>
set FEISHU_SHEET_TOKEN=<spreadsheet-token>
set FEISHU_CHAT_ID=<optional-chat-id>
set ETMS_DOC_ROOT=D:\project\etms\doc
set ETMS_BUG_HTML=D:\project\etms\doc\bug.html
set ETMS_BUG_OWNER=28
set ETMS_APP_SHEET_ID=XNeO5J
```

也可以在 `%ETMS_DOC_ROOT%\bug_config.json` 里配置：

```json
{
  "FEISHU_APP_ID": "<feishu-app-id>",
  "FEISHU_APP_SECRET": "<feishu-app-secret>",
  "FEISHU_SHEET_TOKEN": "<spreadsheet-token>",
  "FEISHU_CHAT_ID": "<optional-chat-id>",
  "ETMS_BUG_HTML": "D:/project/etms/doc/bug.html",
  "ETMS_BUG_OWNER": "28",
  "ETMS_APP_SHEET_ID": "XNeO5J",
  "ETMS_BUG_SHEETS": [
    {"id": "NqDPGd", "range": "A1:Z1000", "name": "正式环境紧急Bug反馈"},
    {"id": "wdLlAN", "range": "A1:Z1000", "name": "三期Web端验收测试"},
    {"id": "XNeO5J", "range": "A1:Z1000", "name": "APP端验收测试"}
  ]
}
```

## 运行结果

脚本会读取飞书表格中 `解决状态` 为 `待解决`、`解决中`、`后期解决` 的记录，生成本地 `bug.html`。生成后的页面会突出显示 `分配状态` 等于 `ETMS_BUG_OWNER` 的记录，方便后续筛选和修复。

如果配置了 `FEISHU_CHAT_ID`，脚本会尝试发送一条飞书通知；未配置时只生成本地文件。

## 安全规则

- 不要提交真实飞书密钥、表格 token、群聊 id、cookie、生成的 `bug.html`、下载的截图/视频或本地日志。
- `bug_config.json` 应只放在本机或私有项目目录。
- 如果缺少媒体下载工具，例如 `lark-cli`，不要阻断 bug 文本筛选；在验证记录里说明截图或视频没有刷新即可。
