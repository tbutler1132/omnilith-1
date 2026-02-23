/**
 * Altitude controls widget.
 *
 * Mirrors the old map altitude control shape and drives discrete altitude
 * transitions through the shared HUD control callback.
 */

import type { Altitude } from '../../../contracts/altitude.js';
import { ALTITUDE_LABELS } from '../../../contracts/altitude.js';

interface AltitudeControlsWidgetProps {
  readonly altitude: Altitude;
  readonly onChangeAltitude: (direction: 'in' | 'out') => void;
}

export function AltitudeControlsWidget({ altitude, onChangeAltitude }: AltitudeControlsWidgetProps) {
  return (
    <div className="altitude-controls">
      <button
        type="button"
        className="altitude-btn"
        onClick={() => onChangeAltitude('in')}
        disabled={altitude === 'close'}
        aria-label="Zoom in"
      >
        +
      </button>
      <div className="altitude-indicator">
        <span className="altitude-label">{ALTITUDE_LABELS[altitude]}</span>
        <div className="altitude-pips" aria-hidden>
          <span className={`altitude-pip ${altitude === 'close' ? 'altitude-pip--active' : ''}`} />
          <span className={`altitude-pip ${altitude === 'mid' ? 'altitude-pip--active' : ''}`} />
          <span className={`altitude-pip ${altitude === 'high' ? 'altitude-pip--active' : ''}`} />
        </div>
      </div>
      <button
        type="button"
        className="altitude-btn"
        onClick={() => onChangeAltitude('out')}
        disabled={altitude === 'high'}
        aria-label="Zoom out"
      >
        &minus;
      </button>
    </div>
  );
}
