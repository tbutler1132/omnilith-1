/**
 * Community content type contract.
 *
 * Registers the community content type so organism state with this
 * payload shape can be validated and rendered through the registry.
 */

import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateCommunity } from './validator.js';

export const communityContentType: ContentTypeContract = {
  typeId: 'community' as ContentTypeId,
  validate: validateCommunity,
};
