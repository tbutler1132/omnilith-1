/**
 * Pan controls widget.
 *
 * Offers directional controls for moving the map viewport without drag.
 */

type PanDirection = 'up' | 'down' | 'left' | 'right';

interface PanControlsWidgetProps {
  readonly onPan: (direction: PanDirection) => void;
}

export function PanControlsWidget({ onPan }: PanControlsWidgetProps) {
  return (
    <fieldset className="map-pan-controls">
      <legend className="map-pan-legend">Pan map</legend>
      <span className="map-pan-spacer" aria-hidden />
      <button type="button" className="map-pan-btn map-pan-btn--up" onClick={() => onPan('up')} aria-label="Pan map up">
        &uarr;
      </button>
      <span className="map-pan-spacer" aria-hidden />
      <button
        type="button"
        className="map-pan-btn map-pan-btn--left"
        onClick={() => onPan('left')}
        aria-label="Pan map left"
      >
        &larr;
      </button>
      <span className="map-pan-spacer" aria-hidden />
      <button
        type="button"
        className="map-pan-btn map-pan-btn--right"
        onClick={() => onPan('right')}
        aria-label="Pan map right"
      >
        &rarr;
      </button>
      <span className="map-pan-spacer" aria-hidden />
      <button
        type="button"
        className="map-pan-btn map-pan-btn--down"
        onClick={() => onPan('down')}
        aria-label="Pan map down"
      >
        &darr;
      </button>
      <span className="map-pan-spacer" aria-hidden />
    </fieldset>
  );
}
