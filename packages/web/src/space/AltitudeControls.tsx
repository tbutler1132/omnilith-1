/**
 * AltitudeControls — fixed-position HUD for altitude navigation.
 *
 * Shows +/- buttons with the current altitude level label between them.
 * Positioned bottom-right. Provides clear visual feedback about which
 * discrete altitude level the viewport is at.
 */

import type { Altitude } from './viewport-math.js';

interface AltitudeControlsProps {
  altitude: Altitude;
  onChangeAltitude: (direction: 'in' | 'out') => void;
}

const LABELS: Record<Altitude, string> = {
  high: 'High',
  mid: 'Mid',
  close: 'Close',
};

export function AltitudeControls({ altitude, onChangeAltitude }: AltitudeControlsProps) {
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
        <span className="altitude-label">{LABELS[altitude]}</span>
        <div className="altitude-pips">
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
