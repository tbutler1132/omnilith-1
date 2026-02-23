# 036 — World Map Governance, Platform Custody, and Closed-Loop Credit Policy

## Context

Recent architecture discussion resolved three connected concerns:

- where canonical truth for map division should live
- how to avoid founder lock-in if infrastructure operations are initially centralized
- how to introduce credits without immediately entering high-friction money-like compliance paths

The discussion also clarified composition placement for economic organisms inside the Capital Community boundary.

## Decision

### 1) Canonical world-map truth remains in Omnilith state history

The canonical source of truth for map division is the `World Map` organism state history (`spatial-map`), not a blockchain execution layer.

- chain usage, if added, is witness-style anchoring only (for example: signed checkpoint hashes)
- chain anchoring does not replace kernel state management, proposal evaluation, or integrate paths

### 2) World Map remains an organism; infrastructure hosts it; community governance regulates it

The `World Map` is an organism, not infrastructure.

- infrastructure responsibilities: seeding, pointer persistence, query/index support, visibility defaults, and event emission
- governance responsibilities: policy organisms composed to regulate mutation of map state
- direction: system hosts it; community governance tends it

### 3) Economic ledger composition lives under Capital Treasury

The credit ledger organism should be composed inside `Capital Treasury`, while map-governance organisms belong under governance boundaries (for example `Capital Government` or a dedicated map-governance boundary).

This keeps composition legible:

- treasury boundary: economic policy and ledger organisms
- governance boundary: map and civic policy organisms

### 4) Closed-loop credit baseline for Phase 1 simplicity

Phase 1 economic direction is a closed-loop credit model:

- non-redeemable credits by default (`no cash value`, except where law requires otherwise)
- platform-use only
- non-transferable between users by default
- display/accounting ratio may remain `1 credit = 1 USD` for simplicity

If redeemability is introduced later, treat it as a distinct compliance track requiring formal legal review before rollout.

### 5) Anti-capture custody direction

Operational control should move from founder-personal custody to entity and policy custody:

- hosting, domain, repository, and backup control under legal-entity accounts
- multi-party control for critical access and key rotation
- explicit succession/rotation rules for integrator assignment in governance policy organisms

## Rationale

- Preserves kernel-centered coherence: map truth is already represented by organism state + state history.
- Avoids premature chain complexity while preserving future verifiability through optional anchoring.
- Maintains category clarity from the model (organisms vs infrastructure vs relationships vs rendering).
- Reduces economic/legal surface area in Phase 1 by separating closed-loop credits from redeemable money paths.
- Reduces founder lock-in risk by making authority legible and transferable through policy and custody structure.

## Consequences

### Positive

- One canonical truth path for map mutation and audit.
- Clean composition boundaries between governance and treasury concerns.
- Lower implementation and compliance overhead for early credits.
- Clear path to stronger legitimacy without requiring on-chain execution.

### Tradeoff

- Public neutrality/trust depends on transparent governance and records rather than chain-native settlement.
- Redeemable credits are deferred and will require materially more legal/compliance work when pursued.
- Anti-capture guarantees require ongoing governance discipline, not just initial setup.

## Status

Accepted (implementation staged; no immediate kernel change required).
