/**
 * Song content type contract.
 *
 * Registers the song content type so organism state with this
 * payload shape can be validated and rendered through the registry.
 */

import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateSong } from './validator.js';

export const songContentType: ContentTypeContract = {
  typeId: 'song' as ContentTypeId,
  validate: validateSong,
};
