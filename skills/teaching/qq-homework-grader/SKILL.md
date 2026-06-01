---
name: qq-homework-grader
description: Grades QQ group homework using Computer Use/virtual mouse and prepares scores for QQEX/Tencent Docs spreadsheets. Use when the user asks to批改QQ群作业, grade QQ image/text homework, grade QQ file or experiment submissions, download homework files to D:\HW, or paste scores into QQEX/腾讯文档 Excel.
---

# QQ Homework Grader

Use this skill to grade QQ group homework in the Windows desktop UI and prepare a one-column score paste for QQEX/Tencent Docs Excel.

Before controlling the desktop, load and follow the `computer-use:computer-use` skill. Use virtual mouse/keyboard for QQ and QQEX operations. Do not publish QQ teacher comments or click "发布评语"; only record scores and paste/write the spreadsheet score column.

## Quick Workflow

1. Confirm the target assignment, target spreadsheet column, workbook path if available, and roster mapping. Defaults: student rows start at row 3, student ID in column A, name in column B.
2. Open the assignment prompt, image, file, or experiment requirement first. Build a short grading standard before scoring submissions.
3. Enter "检查作业" and inspect each completed student submission in QQ. Record `id`, `name`, `score`, and a short private reason in your notes.
4. Leave unsubmitted students blank in Excel. Do not infer submissions for students not present in the completed list.
5. Generate the single-column score text in spreadsheet roster order, then paste it into the target starting cell such as `T3`, `U3`, or `V3`.
6. After pasting, verify non-empty count, blank students, and total score against the generated summary.

## Submission Types

For image or text homework, grade directly from the QQ detail view. Open image previews when the thumbnail is too small; inspect all images in multi-image submissions.

For file or experiment homework:

- The user must provide the experiment body, reference file, answer key, or rubric before grading. If missing, ask for it before scoring.
- Default download directory is `D:\HW`.
- Run `scripts/hw_download_manifest.py baseline --dir D:\HW` before downloading student files.
- Download using the QQ file card download icon. Wait for each file to appear under `D:\HW`, then inspect it locally.
- At the end, run `scripts/hw_download_manifest.py status --dir D:\HW` to list this session's downloads, then `cleanup --yes` to delete only newly downloaded files.
- If cleanup would require deleting pre-existing files, clearing all of `D:\HW`, or removing non-empty directories, stop and ask the user for confirmation.

## Score Records

Keep a machine-readable score log while grading:

```json
[
  {"id": "S001", "name": "Student A", "score": 10, "note": "complete"},
  {"id": "S002", "name": "Student B", "score": 8, "note": "missing one key result"}
]
```

Scores normally use `10`, `9`, `8`, or `6`. Use blank/null only for unsubmitted work. Private notes are for auditability and must not be posted into QQ.

## Spreadsheet Paste

Use `scripts/prepare_scores_clipboard.py` when a local `.xlsx` roster/cache file is available:

```powershell
python scripts\prepare_scores_clipboard.py --xlsx data.xlsx --scores scores.json --sheet "D 课后作业(8)" --start-row 3 --id-col A --name-col B --copy
```

The script orders scores by Excel roster rows, keeps missing submissions as blank lines, reports row count, non-empty count, blank students, total score, and unmatched score records, and optionally copies the column text to the Windows clipboard.

If no local workbook is available, still build the same one-column text from the visible roster order and paste it via virtual mouse into QQEX/Tencent Docs Excel. Always re-check the pasted column total and blanks.

## References

- `references/qq-homework-workflow.md` contains detailed QQ and QQEX desktop operation guidance.
- `references/scoring.md` contains the default scoring rubric and ambiguity rules.
