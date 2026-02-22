/**
 * Variable content type — a derived value computed from observations.
 *
 * Variables are the interpretive layer of cybernetic loops. Where sensors
 * collect raw readings, variables hold computed meanings: "community health
 * is 0.82" or "activity trend is declining." Variables carry threshold
 * awareness so response policies can act on them.
 *
 * Governance-adjacent. Schemas are strict.
 */

import type { OrganismId, Timestamp } from '@omnilith/kernel';

export interface VariableThresholds {
  readonly low?: number;
  readonly critical?: number;
}

export interface VariableComputation {
  readonly mode: 'observation-sum';
  readonly sensorLabel?: string;
  readonly sensorOrganismId?: OrganismId;
  readonly metric: string;
  readonly windowSeconds?: number;
  readonly clampMin?: number;
  readonly clampMax?: number;
}

export interface VariablePayload {
  readonly label: string;
  readonly value: number;
  readonly unit?: string;
  readonly thresholds?: VariableThresholds;
  readonly computation?: VariableComputation;
  readonly computedFrom?: string;
  readonly computedAt: Timestamp;
}
