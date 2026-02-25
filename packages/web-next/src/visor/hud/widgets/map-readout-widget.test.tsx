import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createEmptySpatialContext } from '../../apps/spatial-context-contract.js';
import { MapReadoutWidget } from './map-readout-widget.js';

function renderReadout(overrides: Partial<ReturnType<typeof createEmptySpatialContext>> = {}) {
  return renderToStaticMarkup(
    createElement(MapReadoutWidget, {
      spatialContext: {
        ...createEmptySpatialContext(),
        ...overrides,
      },
    }),
  );
}

describe('MapReadoutWidget', () => {
  it('renders fallback values when map telemetry is not available', () => {
    const html = renderReadout();
    expect(html).toContain('Map readout');
    expect(html).toContain('Map');
    expect(html).toContain('Cursor');
    expect(html).toContain('Hover');
    expect(html).toContain('Focus');
    expect(html).toContain('none');
  });

  it('renders cursor and organism telemetry when available', () => {
    const html = renderReadout({
      mapOrganismId: 'map-community-origin',
      cursorWorld: { x: 248.2, y: 912.8 },
      hoveredEntry: {
        organismId: 'organism-hovered',
        name: 'Text Organism',
        contentTypeId: 'text',
        x: 1200,
        y: 900,
        size: 0.5,
      },
      focusedEntry: {
        organismId: 'organism-focused',
        name: 'Community',
        contentTypeId: 'community',
        x: 1000,
        y: 800,
        size: 1,
      },
    });

    expect(html).toContain('map-community-origin');
    expect(html).toContain('248, 913');
    expect(html).toContain('Text Organism');
    expect(html).toContain('s=0.5');
    expect(html).toContain('Community');
    expect(html).toContain('s=1');
  });
});
