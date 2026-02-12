/**
 * ContentTypeRegistry — port for registering and looking up content types.
 *
 * Content types are plugins that teach the kernel how to handle
 * specific kinds of data. The registry is populated at startup
 * by the adapter layer.
 */

import type { ContentTypeId } from '../identity.js';
import type { ContentTypeContract } from './content-type-contract.js';

export interface ContentTypeRegistry {
  register(contract: ContentTypeContract): void;
  get(typeId: ContentTypeId): ContentTypeContract | undefined;
  has(typeId: ContentTypeId): boolean;
  getAll(): ReadonlyArray<ContentTypeContract>;
}
