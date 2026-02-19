# 027 — LLM Embedded Policy Selection and Bounded Autonomy

## Context

We stress-tested the organism model against two hypotheticals:

- can a full cybernetic governance pattern (for example, a viable systems style recursion) be modeled using only organism identity, state, composition, policy evaluation, events, and querying
- can an LLM participate in the loop without adding a new infrastructure concern or collapsing human stewardship

The architecture answer was yes, but only if AI participation is placed in the adapter/periphery layer and all consequential mutation still flows through existing kernel operations.

## Decision

Adopt an embedded LLM pattern as a bounded selector/advisor in cybernetic loops, while keeping policy organisms and proposal/integration governance as the canonical mutation path.

### 1) Placement and authority

- LLM execution lives in adapters (API/periphery), not in the kernel.
- The LLM never mutates organism state directly.
- The LLM returns structured recommendations (for example selected policy organism, confidence, rationale, or no-action).

### 2) Policy selection over freeform execution

- In cybernetic loops, the LLM primarily selects among pre-composed policy organisms inside the active boundary.
- Selected policy organisms remain deterministic executors under normal visibility and access checks.
- If a recommendation points outside the boundary allowlist, execution is declined.

### 3) Split by domain stakes

- Cybernetic/regulatory flow can run continuously with bounded auto-execution for low-risk actions.
- Creative organisms remain human-stewarded: AI may open proposals, but humans remain primary integrators for meaningful creative trajectory decisions.
- High-impact actions require human integration or stricter policy organisms.

### 4) External action loops are first-class

- Sensor organisms ingest external signals.
- Policy organisms evaluate and trigger action adapters that communicate with external systems.
- Sensor organisms feed outcomes back into the system, closing the loop.
- Every recommendation, execution, and outcome emits an event for traceability.

### 5) Product and pricing implication

- LLM-in-the-loop behavior is a variable-cost capability.
- Product tiers should expose bounded included usage, with higher tiers unlocking larger automation budgets and stronger governance controls.

## Rationale

- Preserves kernel integrity: no ninth infrastructure concern is introduced.
- Keeps the process deterministic while allowing probabilistic model judgment as an input.
- Maintains stewardship legibility: users can see what was sensed, recommended, executed, integrated, or declined.
- Supports real-world effectors without bypassing boundary governance.
- Aligns with Phase 1 direction: capabilities enter through content types, composition, policy organisms, and adapters.

## Consequences

### Positive

- Strong architecture validation: high-complexity cybernetic behavior emerges from existing primitives.
- Clear governance posture: AI can keep systems flowing without replacing human creative stewardship.
- Better operational safety through explicit allowlists, confidence thresholds, and event traces.

### Tradeoff

- Requires careful adapter implementation for idempotency, retries, and risk-tiered action control.
- Increases operational cost and therefore requires explicit product metering.
- Adds governance design work per boundary (what is auto-executable vs proposal-only).

## Status

Accepted.
