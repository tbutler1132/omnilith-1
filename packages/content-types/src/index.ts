/**
 * @omnilith/content-types — plugins that teach the kernel about specific data.
 *
 * Each content type registers a contract: schema, validator, and
 * optional evaluator. Renderers and differs live in the web package.
 */

export { audioContentType, type AudioPayload, type AudioFormat } from './audio/index.js';
export { textContentType, type TextPayload, type TextFormat } from './text/index.js';
export { imageContentType, type ImagePayload, type ImageFormat } from './image/index.js';
export { spatialMapContentType, type SpatialMapPayload, type SpatialMapEntry } from './spatial-map/index.js';
export {
  compositionReferenceContentType,
  type CompositionReferencePayload,
  type CompositionReferenceEntry,
  type ArrangementType,
} from './composition-reference/index.js';
export { threadContentType, type ThreadPayload, type ThreadPostPayload } from './thread/index.js';
export { integrationPolicyContentType, type IntegrationPolicyPayload } from './integration-policy/index.js';

import type { ContentTypeContract } from '@omnilith/kernel';
import { audioContentType } from './audio/index.js';
import { textContentType } from './text/index.js';
import { imageContentType } from './image/index.js';
import { spatialMapContentType } from './spatial-map/index.js';
import { compositionReferenceContentType } from './composition-reference/index.js';
import { threadContentType } from './thread/index.js';
import { integrationPolicyContentType } from './integration-policy/index.js';

export const allContentTypes: ReadonlyArray<ContentTypeContract> = [
  audioContentType,
  textContentType,
  imageContentType,
  spatialMapContentType,
  compositionReferenceContentType,
  threadContentType,
  integrationPolicyContentType,
];
