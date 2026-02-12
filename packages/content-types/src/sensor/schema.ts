/**
 * Sensor content type — an organism that observes another organism's activity.
 *
 * Sensors are the perceptual layer of cybernetic loops. A sensor watches
 * a target organism and accumulates readings over time. It doesn't act —
 * it observes. Action comes from response policies that read derived
 * variables computed from sensor data.
 *
 * Sensors are governance-adjacent: their readings inform policy decisions.
 * Schemas are strict.
 */

import type { OrganismId, Timestamp } from '@omnilith/kernel';

export type SensorMetric = 'state-changes' | 'proposals' | 'compositions';

export const SENSOR_METRICS: ReadonlySet<string> = new Set([
  'state-changes',
  'proposals',
  'compositions',
]);

export interface SensorReading {
  readonly value: number;
  readonly sampledAt: Timestamp;
}

export interface SensorPayload {
  readonly label: string;
  readonly targetOrganismId: OrganismId;
  readonly metric: SensorMetric;
  readonly readings: ReadonlyArray<SensorReading>;
}
