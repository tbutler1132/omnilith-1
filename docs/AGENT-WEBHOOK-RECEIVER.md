# Agent Webhook Receiver

This is a reference receiver for `.github/workflows/agent-dispatch.yml`.
It accepts `agent` issue dispatch events, stores payloads to disk, and can optionally trigger a local command hook.

## Run locally

```bash
pnpm run agent:receiver
```

Defaults:

- URL: `http://localhost:8789/agent-dispatch`
- Health: `http://localhost:8789/health`
- Queue directory: `tmp/agent-dispatch-events`

## Configure repository secrets

Set these in GitHub repository settings:

- `AGENT_WEBHOOK_URL` (required for dispatch)
- `AGENT_WEBHOOK_TOKEN` (optional, recommended)

For local development, you can expose your machine with a tunnel and set `AGENT_WEBHOOK_URL` to that public endpoint.

## Receiver environment variables

- `AGENT_RECEIVER_PORT` (default: `8789`)
- `AGENT_RECEIVER_PATH` (default: `/agent-dispatch`)
- `AGENT_RECEIVER_OUT_DIR` (default: `tmp/agent-dispatch-events`)
- `AGENT_RECEIVER_MAX_BYTES` (default: `1048576`)
- `AGENT_RECEIVER_TOKEN` (optional; must match `AGENT_WEBHOOK_TOKEN`)
- `AGENT_RECEIVER_HOOK_COMMAND` (optional)

If `AGENT_RECEIVER_HOOK_COMMAND` is set, the command runs after each queued event with `AGENT_EVENT_FILE` pointing at the saved payload file.

## Payload shape

```json
{
  "event": "agent_issue_ready",
  "repository": "owner/repo",
  "repository_url": "https://github.com",
  "issue": {
    "number": 123,
    "title": "agent: do the thing"
  },
  "sender": {
    "login": "contributor"
  }
}
```

The payload includes the full GitHub issue object and sender object in practice.

## Suggested next step

Point `AGENT_RECEIVER_HOOK_COMMAND` to your agent runner wrapper script. That script can parse `AGENT_EVENT_FILE`, clone/pull the repo, execute the task, and open a pull request.
