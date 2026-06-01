# Qipature Skills

Personal agent skills for Codex and compatible coding agents.

This repository collects small, reusable skills for real workflows: Notion reporting, QQ homework grading, and future self-built automations. It follows the same broad shape as `mattpocock/skills`: each skill lives under `skills/<category>/<skill>/SKILL.md`, with any supporting scripts or references beside it.

## Quickstart

Install with the skills installer:

```bash
npx skills@latest add Qipature/skills
```

Then choose the skills you want to install into your agent.

## Skills

### Productivity

- [notion-api-weekly](./skills/productivity/notion-api-weekly/SKILL.md) - Create row-by-row weekly report entries from recent Codex thread activity and upload them to a Notion task/report database through the official Notion API.

### Teaching

- [qq-homework-grader](./skills/teaching/qq-homework-grader/SKILL.md) - Grade QQ group homework using Computer Use/virtual mouse and prepare scores for QQEX/Tencent Docs spreadsheets.

## Maintenance Rules

- Add every new self-built skill to this repository.
- Put each skill in the most specific category under `skills/`.
- Keep `SKILL.md` as the entrypoint for every skill.
- Commit supporting scripts, reference docs, and agent config when the skill depends on them.
- Never commit tokens, account secrets, real Notion database IDs, student privacy data, score result files, downloaded homework files, local logs, or machine-specific environment values.
- Use placeholders such as `<notion-integration-token>` and `<database-url-or-id>` in public examples.

## Repository Layout

```text
.
|-- .claude-plugin/
|   `-- plugin.json
|-- skills/
|   |-- productivity/
|   |   `-- notion-api-weekly/
|   `-- teaching/
|       `-- qq-homework-grader/
|-- LICENSE
`-- README.md
```

## License

MIT
