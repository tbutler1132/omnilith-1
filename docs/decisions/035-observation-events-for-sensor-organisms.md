# 035 — Observation Events for Sensor Organisms

## Context

Sensor organisms need to record frequent observations over time. Keeping every observation in sensor organism state would bloat state history and blur the distinction between:

- organism state as curated manifestation
- event stream as append-only experiential trace

The infrastructure already treats events as the system memory substrate, and cybernetic loops depend on queryable observation history.

## Decision

Record sensor-style observations as first-class events, not as mandatory state appends.

### 1) Add first-class observation event type

Introduce `organism.observed` to the kernel event vocabulary.

### 2) Add a kernel observation use case

Add `recordObservation` in the kernel event layer to:

- validate observation input
- enforce capability checks for recording on the source organism
- enforce target visibility access before recording
- emit a structured `organism.observed` event payload

### 3) Expose observation recording via API

Add `POST /organisms/:id/observations` as a thin adapter route over the kernel use case, with typed request/response contracts.

### 4) Keep sensor organism state curated

Sensor organism state remains for identity/configuration/derived summaries. Raw or high-frequency observation flow belongs in the event stream.

## Rationale

- Preserves clear boundary between state history and event history.
- Prevents unbounded state growth for high-frequency observations.
- Keeps cybernetic inputs queryable without forcing frequent proposal/state churn.
- Aligns with the organism model principle that event emission is a core infrastructure concern.
- Keeps kernel generic (observation event is organism-level, not content-type special-casing).

## Consequences

### Positive

- Better long-term scalability for sensor/awareness patterns.
- Cleaner semantics for downstream variable/prediction/response policy composition.
- Stronger observability for query and rendering layers.

### Tradeoff

- Adds one more event type and one more write path to govern.
- Requires adapters and rendering to handle observation event semantics explicitly.
- Existing sensor payloads that store readings in state may need gradual migration to summary-oriented state.

## Status

Accepted.
