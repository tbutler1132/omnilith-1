/**
 * Response policy contract — registers the response policy with the kernel.
 *
 * This is a policy content type: it includes an evaluator. When composed
 * inside a parent organism, the kernel's proposal evaluation loop will
 * call this evaluator to decide whether proposals pass or are declined.
 */

import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { evaluateResponsePolicy } from './evaluator.js';
import { validateResponsePolicy } from './validator.js';

export const responsePolicyContentType: ContentTypeContract = {
  typeId: 'response-policy' as ContentTypeId,
  validate: validateResponsePolicy,
  evaluate: evaluateResponsePolicy,
};
