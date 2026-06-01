# Default Scoring

Use these defaults unless the user provides a more specific rubric.

## Score Bands

- `10`: Complete and correct. Meets all stated requirements; images/files are readable and verifiable.
- `9`: Basically correct with a minor omission, wording problem, formatting issue, or small non-blocking mistake.
- `8`: One key error, a missing required part, incomplete result evidence, or an experiment file with an obvious but non-fatal problem.
- `6`: Only partially completed, major required content missing, or the file cannot be fully verified but contains meaningful relevant work.
- Blank: Not submitted, inaccessible with no usable evidence, or no completed entry exists for the student.

## Judgment Rules

- Build the answer standard from the assignment prompt before opening student submissions.
- For experiment/file assignments, first read the user-provided experiment body, reference file, or rubric. Do not invent the expected output.
- Use the same threshold for all students in the assignment. If the standard changes midstream, revisit earlier scores.
- When a submission has multiple images/files, grade the combined submission rather than the first item only.
- If a file is corrupt or cannot be opened, try one normal alternative viewer/converter. If still unusable but the filename/content preview shows partial evidence, use `6`; otherwise leave blank only if there is no usable submission.
- Keep short private notes for uncertain scores. Do not paste those notes into QQ.

## Score Log Format

Prefer JSON records that can be consumed by `prepare_scores_clipboard.py`:

```json
[
  {"id": "S001", "name": "Student A", "score": 10, "note": "all required answers present"},
  {"id": "S002", "name": "Student B", "score": 8, "note": "missing final SQL result"}
]
```

Student ID is the primary match key. Name is the fallback key when an ID is unavailable.
