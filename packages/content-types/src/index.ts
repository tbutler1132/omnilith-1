/**
 * @omnilith/content-types — plugins that teach the kernel about specific data.
 *
 * Each content type registers a contract: schema, validator, and
 * optional evaluator. Renderers and differs live in the web package.
 */

export { type AudioFormat, type AudioPayload, audioContentType } from './audio/index.js';
export {
  type ArrangementType,
  type CompositionReferenceEntry,
  type CompositionReferencePayload,
  compositionReferenceContentType,
} from './composition-reference/index.js';
export { type ImageFormat, type ImagePayload, imageContentType } from './image/index.js';
export { type IntegrationPolicyPayload, integrationPolicyContentType } from './integration-policy/index.js';
export { type SpatialMapEntry, type SpatialMapPayload, spatialMapContentType } from './spatial-map/index.js';
export { type TextFormat, type TextPayload, textContentType } from './text/index.js';
export { type ThreadPayload, type ThreadPostPayload, threadContentType } from './thread/index.js';

import type { ContentTypeContract } from '@omnilith/kernel';
import { audioContentType } from './audio/index.js';
import { compositionReferenceContentType } from './composition-reference/index.js';
import { imageContentType } from './image/index.js';
import { integrationPolicyContentType } from './integration-policy/index.js';
import { spatialMapContentType } from './spatial-map/index.js';
import { textContentType } from './text/index.js';
import { threadContentType } from './thread/index.js';

export const allContentTypes: ReadonlyArray<ContentTypeContract> = [
  audioContentType,
  textContentType,
  imageContentType,
  spatialMapContentType,
  compositionReferenceContentType,
  threadContentType,
  integrationPolicyContentType,
];
