/**
 * Response policy content type — governance through cybernetic awareness.
 *
 * A response policy is a policy organism. When composed inside a parent,
 * it evaluates proposals to that parent based on the current state of a
 * variable. This is how cybernetic behavior emerges from composition:
 * a sensor observes, a variable computes, and a response policy governs.
 *
 * The evaluator reads the variable value from its own payload
 * (currentVariableValue), not by querying other organisms. The loop
 * runner is responsible for periodically updating this snapshot.
 *
 * Policy content types MUST have strict, fully typed schemas.
 * Governance bugs are dangerous.
 */

import type { OrganismId } from '@omnilith/kernel';

export type ResponseCondition = 'below' | 'above';
export type ResponseAction = 'decline-all' | 'pass';

export interface ResponsePolicyPayload {
  readonly mode: 'variable-threshold';
  readonly variableLabel?: string;
  readonly variableOrganismId?: OrganismId;
  readonly condition: ResponseCondition;
  readonly threshold: number;
  readonly currentVariableValue?: number;
  readonly action: ResponseAction;
  readonly reason: string;
}
