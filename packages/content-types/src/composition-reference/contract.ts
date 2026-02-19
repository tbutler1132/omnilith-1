/**
 * CompositionReference content type contract.
 *
 * Registers the composition-reference content type so organism state with this
 * payload shape can be validated and rendered through the registry.
 */

import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateCompositionReference } from './validator.js';

export const compositionReferenceContentType: ContentTypeContract = {
  typeId: 'composition-reference' as ContentTypeId,
  validate: validateCompositionReference,
};
