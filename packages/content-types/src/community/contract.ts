import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateCommunity } from './validator.js';

export const communityContentType: ContentTypeContract = {
  typeId: 'community' as ContentTypeId,
  validate: validateCommunity,
};
