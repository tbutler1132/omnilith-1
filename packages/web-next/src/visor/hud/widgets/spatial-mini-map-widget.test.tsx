import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createEmptySpatialContext, type VisorAppSpatialContext } from '../../apps/spatial-context-contract.js';
import { SpatialMiniMapWidget } from './spatial-mini-map-widget.js';

function renderWidget(context: Partial<VisorAppSpatialContext> = {}) {
  const spatialContext: VisorAppSpatialContext = {
    ...createEmptySpatialContext(),
    ...context,
  };

  return renderToStaticMarkup(createElement(SpatialMiniMapWidget, { spatialContext }));
}

describe('SpatialMiniMapWidget', () => {
  it('renders an entered organism mini preview when inside an organism', () => {
    const html = renderWidget({
      enteredOrganismId: 'organism-inside',
      mapSize: { width: 1000, height: 500 },
      mapEntries: [{ organismId: 'org-a', x: 250, y: 125 }],
    });

    expect(html).toContain('Organism mini preview');
    expect(html).toContain('Loading organism...');
    expect(html).not.toContain('spatial-mini-map-entry');
    expect(html).not.toContain('spatial-mini-map-marker--cursor');
  });

  it('renders fallback text when map telemetry is unavailable', () => {
    const html = renderWidget();
    expect(html).toContain('Spatial mini-map');
    expect(html).toContain('Telemetry pending');
    expect(html).not.toContain('spatial-mini-map-marker--viewport');
  });

  it('renders cursor and focus markers using map-normalized coordinates', () => {
    const html = renderWidget({
      mapSize: { width: 1000, height: 500 },
      mapEntries: [
        { organismId: 'org-a', x: 900, y: 400 },
        { organismId: 'org-b', x: 250, y: 125 },
      ],
      cursorWorld: { x: 250, y: 125 },
      focusedEntry: {
        organismId: 'org-focus',
        name: 'Focus',
        contentTypeId: 'text',
        x: 900,
        y: 400,
        size: 1.3,
      },
    });

    expect(html).toContain('spatial-mini-map-marker--cursor');
    expect(html).toContain('spatial-mini-map-marker--focus');
    expect(html).toContain('spatial-mini-map-entry');
    expect(html).toContain('left:25%');
    expect(html).toContain('top:25%');
    expect(html).toContain('left:90%');
    expect(html).toContain('top:80%');
  });

  it('clamps marker coordinates to the map boundary', () => {
    const html = renderWidget({
      mapSize: { width: 1000, height: 500 },
      cursorWorld: { x: -100, y: 900 },
      focusedEntry: {
        organismId: 'org-focus',
        name: 'Focus',
        contentTypeId: 'text',
        x: 10000,
        y: -200,
        size: 0.8,
      },
    });

    expect(html).toContain('spatial-mini-map-marker--cursor');
    expect(html).toContain('left:0%');
    expect(html).toContain('top:100%');
    expect(html).toContain('spatial-mini-map-marker--focus');
    expect(html).toContain('left:100%');
    expect(html).toContain('top:0%');
  });

  it('aligns cursor and focus markers to hovered organism coordinates when hovered', () => {
    const html = renderWidget({
      mapSize: { width: 1000, height: 500 },
      cursorWorld: { x: 100, y: 100 },
      hoveredEntry: {
        organismId: 'org-hover',
        name: 'Hover',
        contentTypeId: 'text',
        x: 800,
        y: 100,
        size: 1,
      },
      focusedEntry: {
        organismId: 'org-focus',
        name: 'Focus',
        contentTypeId: 'text',
        x: 200,
        y: 450,
        size: 1,
      },
    });

    expect(html).toContain('spatial-mini-map-marker--cursor');
    expect(html).toContain('spatial-mini-map-marker--focus');
    expect(html).toContain('spatial-mini-map-marker--cursor" style="left:80%;top:20%"');
    expect(html).toContain('spatial-mini-map-marker--focus" style="left:20%;top:90%"');
  });

  it('anchors cursor marker to focused organism when no hover is active', () => {
    const html = renderWidget({
      mapSize: { width: 1000, height: 500 },
      cursorWorld: { x: 100, y: 100 },
      focusedEntry: {
        organismId: 'org-focus',
        name: 'Focus',
        contentTypeId: 'text',
        x: 700,
        y: 300,
        size: 1,
      },
    });

    expect(html).toContain('spatial-mini-map-marker--cursor');
    expect(html).toContain('spatial-mini-map-marker--cursor" style="left:10%;top:20%"');
    expect(html).toContain('spatial-mini-map-marker--focus" style="left:70%;top:60%"');
  });

  it('snaps cursor marker to nearest organism when cursor is close', () => {
    const html = renderWidget({
      mapSize: { width: 1000, height: 500 },
      mapEntries: [{ organismId: 'org-near', x: 320, y: 210 }],
      cursorWorld: { x: 300, y: 200 },
    });

    expect(html).toContain('spatial-mini-map-marker--cursor" style="left:32%;top:42%"');
  });

  it('does not snap cursor marker when nearest organism is too far', () => {
    const html = renderWidget({
      mapSize: { width: 1000, height: 500 },
      mapEntries: [{ organismId: 'org-far', x: 800, y: 400 }],
      cursorWorld: { x: 100, y: 100 },
    });

    expect(html).toContain('spatial-mini-map-marker--cursor" style="left:10%;top:20%"');
  });
});
