/**
 * Thread content type contract.
 *
 * Registers the thread content type so organism state with this
 * payload shape can be validated and rendered through the registry.
 */

import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateThread } from './validator.js';

export const threadContentType: ContentTypeContract = {
  typeId: 'thread' as ContentTypeId,
  validate: validateThread,
};
