/**
 * Action contract — registers the action content type with the kernel.
 *
 * Actions define adapter-facing execution intents. They do not directly
 * evaluate proposals; runtime adapters invoke them under policy control.
 */

import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateAction } from './validator.js';

export const actionContentType: ContentTypeContract = {
  typeId: 'action' as ContentTypeId,
  validate: validateAction,
};
