/**
 * IntegrationPolicy content type contract.
 *
 * Registers the integration-policy content type so organism state with this
 * payload shape can be validated and rendered through the registry.
 */

import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { evaluateIntegrationPolicy } from './evaluator.js';
import { validateIntegrationPolicy } from './validator.js';

export const integrationPolicyContentType: ContentTypeContract = {
  typeId: 'integration-policy' as ContentTypeId,
  validate: validateIntegrationPolicy,
  evaluate: evaluateIntegrationPolicy,
};
