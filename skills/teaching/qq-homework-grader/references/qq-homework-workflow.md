# QQ Homework Desktop Workflow

This workflow assumes QQ group homework and QQEX/Tencent Docs Excel are already open on Windows.

## Choosing the Assignment

1. From a submission detail page, use `返回` until the assignment detail or "全部作业" list is visible.
2. Select the assignment by date/title. When several assignments share a date, prefer the one matching the requested submission type:
   - Image homework usually appears with `[图片]` or image thumbnails.
   - Experiment/report homework usually appears as file cards or report titles such as "实验报告".
3. Open the assignment prompt first. For image prompts, open the prompt image large enough to read all requirements.
4. Write down the target Excel sheet/column before grading, for example `D 课后作业(8)` column `T`.

## Grading Student Submissions

1. Enter `检查作业`.
2. For each completed submission, identify student ID and name from the card, title, file name, or visible account label.
3. Inspect the submitted content:
   - Image: open preview if thumbnail detail is insufficient; zoom or switch images as needed.
   - Text: read the full visible response, scrolling if necessary.
   - Multi-image: inspect every image before assigning the score.
   - File card: click the download icon, wait for the file under `D:\HW`, then inspect locally.
4. Record only the private score log. Do not type into the QQ teacher comment box and do not click `发布评语`.
5. Use `下一个` until the completed list ends. If `下一个` is disabled or loops, return to the list and verify no completed students were skipped.

## File and Experiment Downloads

Before downloading, run:

```powershell
python scripts\hw_download_manifest.py baseline --dir D:\HW
```

During grading:

- Click the small download icon beside the QQ file card.
- Wait until the file appears in `D:\HW` and the size is stable.
- If duplicate names appear, do not overwrite intentionally. Let QQ choose its default duplicate-name behavior, then grade the file that appeared during the current session.
- Open documents/spreadsheets/images using normal local viewers. If a file needs a reference or experiment body, use the user-provided material.

After grading:

```powershell
python scripts\hw_download_manifest.py status --dir D:\HW
python scripts\hw_download_manifest.py cleanup --dir D:\HW --yes
```

Cleanup deletes only files that were not present in the baseline. If asked to clear all of `D:\HW`, ask the user to confirm because pre-existing files may be unrelated.

## Pasting Scores into QQEX/Tencent Docs

1. Use `prepare_scores_clipboard.py --copy` when a local `.xlsx` roster/cache is available.
2. Switch to QQEX/Tencent Docs Excel.
3. Click the target starting cell, for example `T3`.
4. Paste with `Ctrl+V`.
5. Verify:
   - Number of non-empty pasted scores.
   - Blank students listed by the script.
   - Column total equals the generated summary.
6. If the pasted range shifts or overwrites the wrong column, undo immediately and re-paste from the correct starting cell.
