# 028 — Proposal Integration Triggered GitHub Issue-to-PR Cybernetic Loop

## Context

We want to validate a first end-to-end cybernetic loop that starts inside Omnilith governance and produces real external implementation work in a repository.

The desired flow is:

- a user opens a proposal for a feature or bug intent
- a human integrator evaluates and either integrate or decline
- integration triggers external issue creation
- a sensor organism detects the issue event
- a response policy can run Codex and open a PR

This tests whether human stewardship can remain the governing threshold while bounded automation handles implementation throughput.

## Decision

Adopt this as the first cybernetic loop to test in Phase 1 extension work, with human integration at the governance point and bounded automation for execution.

### 1) Governance anchor

- Human integrators remain the decision point for proposal integration/decline.
- Only integrated proposals may trigger downstream external automation.

### 2) External implementation loop

- On integration, an adapter action creates a GitHub issue with traceable linkage to the source proposal and organism.
- A sensor organism ingests GitHub issue events.
- A response policy evaluates guardrails (label/scope/risk/cooldown) before any execution.
- If policy conditions pass, Codex is invoked to produce changes and open a PR.

### 3) Safety and control requirements

- Enforce idempotency for proposal-to-issue and issue-to-PR transitions.
- Require explicit allowlists for repositories, branches, and writable paths.
- Emit events for each stage (`proposal_integrated`, `issue_created`, `sensor_detected_issue`, `codex_run_started`, `pr_opened`, `pr_declined`).
- Default high-impact paths to human integration before merge.

## Rationale

- Preserves the organism model: consequential state transition remains governed through proposal integration.
- Demonstrates cybernetic value with a concrete loop that can be measured quickly.
- Keeps automation bounded and legible through explicit policy evaluation and event traces.

## Consequences

### Positive

- Establishes a practical bridge between internal governance and external delivery.
- Provides a reusable pattern for future sensor/variable/prediction/response loops.
- Produces immediate operational feedback on policy quality and automation reliability.

### Tradeoff

- Requires careful adapter engineering for retries, deduplication, and failure handling.
- Introduces external dependency risk (GitHub/API availability, token scope, quota).
- Adds governance design overhead for safe trigger conditions and escalation paths.

## Status

Accepted.
