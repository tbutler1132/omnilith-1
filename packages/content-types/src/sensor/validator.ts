/**
 * Sensor validator — strict validation for sensor payloads.
 *
 * Sensors are governance-adjacent. Their readings feed into variables
 * that drive response policies. Bad sensor data means bad governance.
 */

import type { ValidationResult } from '@omnilith/kernel';
import type { SensorPayload, SensorReading } from './schema.js';
import { SENSOR_METRICS } from './schema.js';

export function validateSensor(payload: unknown): ValidationResult {
  const issues: string[] = [];
  const p = payload as Partial<SensorPayload>;

  if (!p || typeof p !== 'object') {
    return { valid: false, issues: ['Payload must be an object'] };
  }

  if (typeof p.label !== 'string' || p.label.length === 0) {
    issues.push('label must be a non-empty string');
  }

  if (typeof p.targetOrganismId !== 'string' || p.targetOrganismId.length === 0) {
    issues.push('targetOrganismId must be a non-empty string');
  }

  if (typeof p.metric !== 'string' || !SENSOR_METRICS.has(p.metric)) {
    issues.push(`metric must be one of: ${[...SENSOR_METRICS].join(', ')}`);
  }

  if (!Array.isArray(p.readings)) {
    issues.push('readings must be an array');
  } else {
    for (let i = 0; i < p.readings.length; i++) {
      const reading = p.readings[i] as Partial<SensorReading> | undefined;
      if (!reading || typeof reading !== 'object') {
        issues.push(`readings[${i}] must be an object`);
        continue;
      }
      if (typeof reading.value !== 'number') {
        issues.push(`readings[${i}].value must be a number`);
      }
      if (typeof reading.sampledAt !== 'number') {
        issues.push(`readings[${i}].sampledAt must be a number`);
      }
    }
  }

  return { valid: issues.length === 0, issues };
}
