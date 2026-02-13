/**
 * VisorHere — shows the universal layer for the currently focused organism.
 *
 * If no organism is focused, shows guidance text.
 */

import { UniversalLayer } from '../organisms/UniversalLayer.js';
import { usePlatform } from '../platform/index.js';

export function VisorHere() {
  const { state } = usePlatform();

  if (!state.focusedOrganismId) {
    return (
      <div className="visor-section-empty">
        <p>No organism focused.</p>
        <p className="visor-section-hint">Click an organism in the space or select one from the Mine tab.</p>
      </div>
    );
  }

  return <UniversalLayer organismId={state.focusedOrganismId} />;
}
