# Contributing to Omnilith

Omnilith supports two contribution lanes:

1. Human-authored code contributions through normal pull requests.
2. AI-authored implementation proposals through issue proposals.

Both lanes are welcome. The second lane is proposal-first by design.

## Human Code Contributions

Use normal pull requests for human-authored code.

Before opening a pull request:

- run `pnpm run check`
- follow the architecture and controlled vocabulary in `AGENTS.md`
- keep kernel boundaries intact (`packages/kernel` must stay dependency-free)

## AI Contribution Lane (Proposal-First)

If you want AI to implement work, propose the work as an issue proposal instead of submitting AI-authored code directly.

### How to propose AI work

1. Add a new file in `.github/issue-proposals/`.
2. Put one proposal JSON object in that file with a unique `proposalId`.
3. Open a pull request containing that file change.
4. Maintainers review and decide whether to integrate the proposal.
5. After merge to `main`, automation creates a GitHub issue from the accepted proposal.

### Required fields

Each proposal file must contain one object with:

- `proposalId`: unique kebab-case identifier
- `title`: issue title
- `body`: issue body with context, acceptance criteria, and constraints

Optional fields:

- `labels`: list of GitHub labels
- `openedBy`: proposer handle
- `aiAuthored`: `true` if proposal is intended for AI implementation

## Example proposal entry

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

## Validation and Sync Automation

- Pull requests that change `.github/issue-proposals/` run validation via `node scripts/issue-proposals.mjs validate`.
- Pushes to `main` that include proposal changes run sync via `node scripts/issue-proposals.mjs sync`.
- Sync is idempotent: proposals already converted to issues are skipped using the `proposal-id` marker.
- Synced issues include a default `agent` label.
- If `aiAuthored` is `true`, synced issues also include `ai-authored`.

## Agent Handoff

- You can open issues directly with `.github/ISSUE_TEMPLATE/agent-execution.yml`.
- Issues labeled `agent` trigger `.github/workflows/agent-dispatch.yml`.
- Dispatch sends issue payload to `AGENT_WEBHOOK_URL` (optional bearer token: `AGENT_WEBHOOK_TOKEN`).
- A reference local receiver is available at `scripts/agent-webhook-receiver.mjs`.
- Setup details: `docs/AGENT-WEBHOOK-RECEIVER.md`.

## Notes

- Use issue proposals for AI-authored implementation work by default.
- Human-authored code pull requests remain supported.
- If uncertain which lane applies, open an issue proposal first.
