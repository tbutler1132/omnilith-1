import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateIntegrationPolicy } from './validator.js';
import { evaluateIntegrationPolicy } from './evaluator.js';

export const integrationPolicyContentType: ContentTypeContract = {
  typeId: 'integration-policy' as ContentTypeId,
  validate: validateIntegrationPolicy,
  evaluate: evaluateIntegrationPolicy,
};
