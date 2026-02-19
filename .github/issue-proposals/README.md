# Issue Proposals

One proposal per file to reduce merge conflicts.

This directory is the proposal-first intake path. It is compatible with the
slice system in `docs/DEVELOPMENT-SYSTEM.md`.

Recommended default intake is the GitHub issue form:

- `.github/ISSUE_TEMPLATE/agent-execution.yml` (Slice Intake)

Use this JSON path when you want to queue proposals asynchronously and let
automation mint GitHub issues after merge.

- File format: JSON object in `.json` files only
- File naming: `YYYYMMDD-short-proposal-id.json`
- Required fields: `proposalId`, `title`, `body`
- Optional fields: `labels`, `openedBy`, `aiAuthored`

Example:

```json
{
  "proposalId": "web-universal-layer-vitality-signals",
  "title": "Surface vitality signals in the universal layer",
  "body": "Add vitality prominence indicators to the universal layer rendering. Include tests and preserve the controlled vocabulary.",
  "labels": ["area:web", "kind:enhancement"],
  "openedBy": "@your-handle",
  "aiAuthored": true
}
```

To keep this path aligned with the unified slice system, include slice-ready
details in `body`:

- intent (user outcome)
- boundary (in / out)
- touchpoints (kernel / API / rendering / content types)
- risks
- acceptance checks
- verification evidence

Notes:

- Keep only live proposals as `.json` files in this directory.
- Use `EXAMPLE.md` as a reference template and create a new dated `.json` file for real proposals.
