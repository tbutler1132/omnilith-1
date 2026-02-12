import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateImage } from './validator.js';

export const imageContentType: ContentTypeContract = {
  typeId: 'image' as ContentTypeId,
  validate: validateImage,
};
