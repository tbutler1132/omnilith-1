/**
 * StemsBundle content type contract.
 *
 * Registers the stems-bundle content type so organism state with this
 * payload shape can be validated and rendered through the registry.
 */

import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateStemsBundle } from './validator.js';

export const stemsBundleContentType: ContentTypeContract = {
  typeId: 'stems-bundle' as ContentTypeId,
  validate: validateStemsBundle,
};
