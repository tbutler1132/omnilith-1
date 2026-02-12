/**
 * Integration policy content type — governance through composition.
 *
 * An integration policy is a policy organism. When composed inside
 * a parent organism, it evaluates proposals to that parent.
 *
 * Phase 1 supports only the 'single-integrator' mode. The mode
 * discriminator allows new governance models to be added as new
 * content type versions in Phase 2.
 *
 * Policy content types MUST have strict, fully typed schemas.
 * Governance bugs are dangerous.
 */

import type { UserId } from '@omnilith/kernel';

export interface IntegrationPolicyPayload {
  readonly mode: 'single-integrator';
  readonly integratorId: UserId;
}
