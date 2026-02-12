import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateAudio } from './validator.js';

export const audioContentType: ContentTypeContract = {
  typeId: 'audio' as ContentTypeId,
  validate: validateAudio,
};
