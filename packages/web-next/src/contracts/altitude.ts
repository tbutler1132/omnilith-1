/**
 * Altitude contract for map zoom levels.
 *
 * Keeps the HUD and map viewport aligned on one shared discrete altitude
 * vocabulary without coupling either feature to implementation details.
 */

export type Altitude = 'high' | 'mid' | 'close';

export const ALTITUDE_LABELS: Readonly<Record<Altitude, string>> = {
  high: 'High',
  mid: 'Mid',
  close: 'Close',
};
