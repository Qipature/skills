---
name: etms-app-debug
description: ETMS APP bug-fix workflow for Feishu bug tables. Use when the user asks to update ETMS bugs, filter by an assignee/owner number such as 28, fix APP-side issues, verify in HBuilderX/emulator, then commit and push.
---

# ETMS App Debug

Use this skill for ETMS APP bug-fix work driven by the Feishu bug table. The default local setup targets assignee `28`, but the workflow is intentionally parameterized so another owner only changes paths and the owner number.

## Local Configuration

Set or confirm these values before starting. Environment variables win over examples here.

```text
ETMS_APP_ROOT=D:\project\etms-app
ETMS_DOC_ROOT=D:\project\etms\doc
ETMS_BUG_OWNER=28
ETMS_APP_SHEET_ID=XNeO5J
ETMS_REMOTE=origin
ETMS_BRANCH=dev
ETMS_BUG_HTML=%ETMS_DOC_ROOT%\bug.html
```

For another developer, change `ETMS_APP_ROOT`, `ETMS_DOC_ROOT`, and `ETMS_BUG_OWNER`. If their APP sheet or branch differs, also change `ETMS_APP_SHEET_ID` and `ETMS_BRANCH`.

## Bug Table Update

1. Prefer the project's existing script: `%ETMS_DOC_ROOT%\update_bug.bat`.
2. If the project does not have one, copy or run this skill's `scripts/update_bug.bat` and configure the Feishu values described in `scripts/README.md`.
3. Never commit real Feishu `appSecret`, sheet tokens, chat ids, cookies, generated `bug.html`, downloaded images, videos, or local logs to a public skill repository.
4. Missing screenshot or video download helpers such as `lark-cli` should not block text-based bug filtering. Record the missing media as a verification limitation.

## Workflow

1. Protect the working tree.
   - Run `git status --short` in `ETMS_APP_ROOT`.
   - If there are unrelated user changes, save them with a timestamped `git stash push -u -m "codex-before-dev-bug${ETMS_BUG_OWNER}-<timestamp>"` before switching branches.
   - Do not automatically restore that stash after the fix.
2. Sync the requested branch.
   - Run `git fetch <ETMS_REMOTE> --prune`.
   - Confirm `<ETMS_REMOTE>/<ETMS_BRANCH>` exists.
   - Switch to local `<ETMS_BRANCH>` and run `git pull --ff-only <ETMS_REMOTE> <ETMS_BRANCH>`.
   - If the remote branch is missing, stop and report it instead of guessing another branch.
3. Update the bug table.
   - Run `%ETMS_DOC_ROOT%\update_bug.bat` from `ETMS_DOC_ROOT`.
   - Confirm `%ETMS_BUG_HTML%` was rewritten.
4. Parse and choose work.
   - Filter rows where `解决状态` is one of `待解决`, `解决中`, or `后期解决`.
   - Filter `分配状态` equal to `ETMS_BUG_OWNER`.
   - Prefer APP sheet `ETMS_APP_SHEET_ID`.
   - Sort by status priority `待解决 > 解决中 > 后期解决`, then older submit time first.
   - Skip backend/Web/non-repo issues and record why, then continue to the next APP-fixable bug.
5. Fix narrowly.
   - Read the affected page/component/service before editing.
   - Follow existing repo patterns and helper APIs.
   - Keep changes scoped to the bug and avoid reverting user changes.
6. Validate before shipping.
   - Run `git diff --check`.
   - Run `corepack pnpm build:h5`.
   - Run `corepack pnpm type-check`; if it is blocked by known generated `*.vue.js` TS6504 issues, report the exact blocker.
   - Run the APP through HBuilderX and an Android emulator when the bug touches APP behavior.
7. Emulator verification is path testing, not just startup.
   - Use the already logged-in account when available.
   - Navigate with virtual mouse or adb input to the bug's real path.
   - Verify the visible expected result and record what was checked.
   - For owner `28` APP fixes, common paths include personal center stats, learning archives, certificates/projects entries, and live replay entry/error states.
8. Commit and push.
   - Stage only related source and skill/script files.
   - Do not stage `.tools/`, `dist/`, generated HBuilderX output, downloaded screenshots/videos, or unrelated local config.
   - Commit with a concise message such as `fix: resolve app bugs assigned 28`.
   - Push `<ETMS_BRANCH>` to `<ETMS_REMOTE>/<ETMS_BRANCH>`.

## Final Report

Report the bug ids handled, files changed, validation commands and results, emulator paths tested, commit SHA, push target, skipped bugs with reasons, and remaining risks.