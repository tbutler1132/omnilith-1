import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateSpatialMap } from './validator.js';

export const spatialMapContentType: ContentTypeContract = {
  typeId: 'spatial-map' as ContentTypeId,
  validate: validateSpatialMap,
};
