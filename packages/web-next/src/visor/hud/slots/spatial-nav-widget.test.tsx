import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SpatialNavWidget } from './spatial-nav-widget.js';

function renderNav(input: { altitude: 'high' | 'mid' | 'close'; contextLabel?: string | null; canGoBack: boolean }) {
  return renderToStaticMarkup(
    createElement(SpatialNavWidget, {
      altitude: input.altitude,
      contextLabel: input.contextLabel,
      canGoBack: input.canGoBack,
      onGoBack: () => {},
    }),
  );
}

describe('SpatialNavWidget', () => {
  it('shows altitude label and altimeter in map context', () => {
    const html = renderNav({ altitude: 'high', canGoBack: false });
    expect(html).toContain('Wide view');
    expect(html).toContain('space-nav-altimeter');
    expect(html).toContain('disabled');
  });

  it('shows custom context label and hides altimeter in interior context', () => {
    const html = renderNav({ altitude: 'close', contextLabel: 'Organism interior', canGoBack: true });
    expect(html).toContain('Organism interior');
    expect(html).not.toContain('space-nav-altimeter');
    expect(html).not.toContain('disabled');
  });
});
