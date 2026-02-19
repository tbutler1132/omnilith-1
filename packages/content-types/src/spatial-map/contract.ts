/**
 * SpatialMap content type contract.
 *
 * Registers the spatial-map content type so organism state with this
 * payload shape can be validated and rendered through the registry.
 */

import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateSpatialMap } from './validator.js';

export const spatialMapContentType: ContentTypeContract = {
  typeId: 'spatial-map' as ContentTypeId,
  validate: validateSpatialMap,
};
