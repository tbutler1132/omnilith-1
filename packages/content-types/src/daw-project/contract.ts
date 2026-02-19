/**
 * DawProject content type contract.
 *
 * Registers the daw-project content type so organism state with this
 * payload shape can be validated and rendered through the registry.
 */

import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateDawProject } from './validator.js';

export const dawProjectContentType: ContentTypeContract = {
  typeId: 'daw-project' as ContentTypeId,
  validate: validateDawProject,
};
