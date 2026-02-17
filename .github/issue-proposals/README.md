# Issue Proposals

One proposal per file to reduce merge conflicts.

- File format: JSON object
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
