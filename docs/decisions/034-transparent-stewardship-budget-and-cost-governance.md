# 034 — Transparent Stewardship Budget and Cost Governance

## Context

The write path is increasingly AI-assisted:

- users can express intent in natural language
- AI can draft proposals for organism mutation
- users review and integrate or decline through governance flows

This improves usability but introduces a real operating cost (model usage). If cost handling is opaque, trust degrades and the platform can feel extractive. If cost handling is too strict or confusing, participation drops.

Omnilith needs a pricing and governance approach that:

- preserves low-friction participation
- keeps cost exposure bounded
- makes budget and spending legible
- aligns with stewardship language rather than hidden monetization

## Decision

Adopt a transparent hybrid model: public-service baseline + stewardship budget + optional overage.

### 1) Public-service baseline (free lane)

Keep core read-path experience and lightweight interactions available without paid access. This includes arriving, navigating, exploring, and other low-cost actions.

### 2) Stewardship budget (subscription lane)

Offer a recurring subscription that includes a clearly defined monthly AI usage budget. Treat this as a stewardship contribution to shared infrastructure.

### 3) Optional overage (top-ups)

For users who exceed included usage, allow explicit top-ups. Default behavior should avoid surprise charges:

- clear usage meter
- pre-action cost estimate for heavier AI actions
- optional hard cap that blocks overage until user opts in

### 4) Advanced bring-your-own-provider

Support user-supplied model credentials only as an advanced option, not the default entry path.

## Transparency Requirements

Publish cost and budget visibility at two levels:

### Platform-level treasury visibility

Provide a recurring public budget report with category-level outflow:

- model usage
- hosting and infrastructure
- storage
- operations/stewardship
- reserve buffer

Provide inflow and runway summary:

- subscription/top-up inflow totals
- outflow totals by category
- estimated operating runway

### User-level personal ledger visibility

Provide each user with a personal usage ledger showing:

- usage by action
- model tier used
- credits/tokens consumed
- remaining included budget

## Rationale

- AI assistance should reduce friction, but governance requires legibility.
- Transparency converts pricing from hidden extraction to accountable stewardship.
- A hybrid model protects inclusion (free baseline) while preserving economic viability (subscription + optional overage).
- Explicit ledgers and cost estimates let users control spend before commitment.
- This aligns with Omnilith's broader principle that meaningful system behavior should be observable.

## Consequences

### Positive

- stronger trust through visible budget and usage accounting
- better user agency over spend
- predictable cost recovery for platform sustainability
- cleaner framing for the future economic layer without forcing early complexity into kernel concerns

### Tradeoff

- requires additional rendering and API adapter work for usage metering and reporting
- treasury reporting must balance transparency with security/privacy constraints
- cost estimates are approximate and require clear communication about variance

## Status

Accepted.
