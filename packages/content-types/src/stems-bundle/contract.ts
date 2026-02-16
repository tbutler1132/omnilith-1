import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateStemsBundle } from './validator.js';

export const stemsBundleContentType: ContentTypeContract = {
  typeId: 'stems-bundle' as ContentTypeId,
  validate: validateStemsBundle,
};
