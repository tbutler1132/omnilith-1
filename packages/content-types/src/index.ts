/**
 * @omnilith/content-types — plugins that teach the kernel about specific data.
 *
 * Each content type registers a contract: schema, validator, and
 * optional evaluator. Renderers and differs live in the web package.
 */

export { type AudioFormat, type AudioPayload, audioContentType } from './audio/index.js';
export { type CommunityPayload, communityContentType } from './community/index.js';
export {
  type ArrangementType,
  type CompositionReferenceEntry,
  type CompositionReferencePayload,
  compositionReferenceContentType,
} from './composition-reference/index.js';
export { type ImageFormat, type ImagePayload, imageContentType } from './image/index.js';
export { type IntegrationPolicyPayload, integrationPolicyContentType } from './integration-policy/index.js';
export {
  type ResponseAction,
  type ResponseCondition,
  type ResponsePolicyPayload,
  responsePolicyContentType,
} from './response-policy/index.js';
export {
  type SensorMetric,
  type SensorPayload,
  type SensorReading,
  sensorContentType,
} from './sensor/index.js';
export { type SpatialMapEntry, type SpatialMapPayload, spatialMapContentType } from './spatial-map/index.js';
export {
  type TemplatePayload,
  type TemplateRecipeStep,
  templateContentType,
} from './template/index.js';
export { type TextFormat, type TextPayload, textContentType } from './text/index.js';
export { type ThreadPayload, type ThreadPostPayload, threadContentType } from './thread/index.js';
export {
  type VariablePayload,
  type VariableThresholds,
  variableContentType,
} from './variable/index.js';

import type { ContentTypeContract } from '@omnilith/kernel';
import { audioContentType } from './audio/index.js';
import { communityContentType } from './community/index.js';
import { compositionReferenceContentType } from './composition-reference/index.js';
import { imageContentType } from './image/index.js';
import { integrationPolicyContentType } from './integration-policy/index.js';
import { responsePolicyContentType } from './response-policy/index.js';
import { sensorContentType } from './sensor/index.js';
import { spatialMapContentType } from './spatial-map/index.js';
import { templateContentType } from './template/index.js';
import { textContentType } from './text/index.js';
import { threadContentType } from './thread/index.js';
import { variableContentType } from './variable/index.js';

export const allContentTypes: ReadonlyArray<ContentTypeContract> = [
  communityContentType,
  audioContentType,
  textContentType,
  imageContentType,
  spatialMapContentType,
  compositionReferenceContentType,
  threadContentType,
  integrationPolicyContentType,
  sensorContentType,
  variableContentType,
  responsePolicyContentType,
  templateContentType,
];
