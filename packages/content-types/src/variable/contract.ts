/**
 * Variable contract — registers the variable content type with the kernel.
 *
 * Variables hold computed state. They have no evaluator because they
 * don't govern — response policies read them and govern on their behalf.
 */

import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateVariable } from './validator.js';

export const variableContentType: ContentTypeContract = {
  typeId: 'variable' as ContentTypeId,
  validate: validateVariable,
};
