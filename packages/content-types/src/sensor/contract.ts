/**
 * Sensor contract — registers the sensor content type with the kernel.
 *
 * Sensors observe. They have no evaluator because they don't govern.
 */

import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateSensor } from './validator.js';

export const sensorContentType: ContentTypeContract = {
  typeId: 'sensor' as ContentTypeId,
  validate: validateSensor,
};
