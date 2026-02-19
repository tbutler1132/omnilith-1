/**
 * Audio content type contract.
 *
 * Registers the audio content type so organism state with this
 * payload shape can be validated and rendered through the registry.
 */

import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateAudio } from './validator.js';

export const audioContentType: ContentTypeContract = {
  typeId: 'audio' as ContentTypeId,
  validate: validateAudio,
};
