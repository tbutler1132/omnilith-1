/**
 * Image content type contract.
 *
 * Registers the image content type so organism state with this
 * payload shape can be validated and rendered through the registry.
 */

import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateImage } from './validator.js';

export const imageContentType: ContentTypeContract = {
  typeId: 'image' as ContentTypeId,
  validate: validateImage,
};
