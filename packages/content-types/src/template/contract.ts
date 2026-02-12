import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateTemplate } from './validator.js';

export const templateContentType: ContentTypeContract = {
  typeId: 'template' as ContentTypeId,
  validate: validateTemplate,
};
