# ETMS Bug Update Scripts

These scripts are reusable helpers for the `etms-app-debug` skill. They are safe for a public repository because real Feishu credentials are not committed.

## Quick Use

If your ETMS doc folder already contains the project script:

```bat
set ETMS_DOC_ROOT=D:\project\etms\doc
set ETMS_BUG_OWNER=28
update_bug.bat
```

Or pass the doc folder directly:

```bat
update_bug.bat D:\project\etms\doc
```

The wrapper runs `%ETMS_DOC_ROOT%\update_bug_data.js` when it exists. If it does not exist, it falls back to `update_bug_data.template.js`.

## Required Template Configuration

Use environment variables:

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

Or create `%ETMS_DOC_ROOT%\bug_config.json`:

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

For another owner, usually only change `ETMS_DOC_ROOT`, `ETMS_BUG_HTML`, and `ETMS_BUG_OWNER`. For this team's default, `ETMS_BUG_OWNER=28`.

## Safety Rules

- Do not commit real Feishu secrets, spreadsheet tokens, chat ids, generated `bug.html`, downloaded media, or local logs.
- Keep `bug_config.json` local or add it to your private/project-specific ignore rules.
- If media download tooling is unavailable, continue with text filtering and note that screenshots/videos were not refreshed.
