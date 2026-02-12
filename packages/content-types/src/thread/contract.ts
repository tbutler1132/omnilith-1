import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateThread } from './validator.js';

export const threadContentType: ContentTypeContract = {
  typeId: 'thread' as ContentTypeId,
  validate: validateThread,
};
