/**
 * Text content type contract.
 *
 * Registers the text content type so organism state with this
 * payload shape can be validated and rendered through the registry.
 */

import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateText } from './validator.js';

export const textContentType: ContentTypeContract = {
  typeId: 'text' as ContentTypeId,
  validate: validateText,
};
