import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateCompositionReference } from './validator.js';

export const compositionReferenceContentType: ContentTypeContract = {
  typeId: 'composition-reference' as ContentTypeId,
  validate: validateCompositionReference,
};
