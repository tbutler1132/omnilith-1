import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateText } from './validator.js';

export const textContentType: ContentTypeContract = {
  typeId: 'text' as ContentTypeId,
  validate: validateText,
};
