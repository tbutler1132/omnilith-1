/**
 * Template content type contract.
 *
 * Registers the template content type so organism state with this
 * payload shape can be validated and rendered through the registry.
 */

import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateTemplate } from './validator.js';

export const templateContentType: ContentTypeContract = {
  typeId: 'template' as ContentTypeId,
  validate: validateTemplate,
};
