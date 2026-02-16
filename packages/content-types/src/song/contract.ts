import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateSong } from './validator.js';

export const songContentType: ContentTypeContract = {
  typeId: 'song' as ContentTypeId,
  validate: validateSong,
};
