import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateDawProject } from './validator.js';

export const dawProjectContentType: ContentTypeContract = {
  typeId: 'daw-project' as ContentTypeId,
  validate: validateDawProject,
};
