import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SpatialNavWidget } from './spatial-nav-widget.js';

function renderNav(input: {
  currentLabel: string;
  upTargetLabel: string | null;
  showUpControl: boolean;
  canGoUp?: boolean;
}) {
  return renderToStaticMarkup(
    createElement(SpatialNavWidget, {
      currentLabel: input.currentLabel,
      upTargetLabel: input.upTargetLabel,
      showUpControl: input.showUpControl,
      canGoUp: input.canGoUp ?? false,
      onGoUp: () => {},
    }),
  );
}

describe('SpatialNavWidget', () => {
  it('keeps the up slot but hides the button at world map level', () => {
    const html = renderNav({ currentLabel: 'World Map', upTargetLabel: null, showUpControl: false });
    expect(html).toContain('World Map');
    expect(html).toContain('space-nav-back-btn');
    expect(html).toContain('space-nav-back-btn--hidden');
    expect(html).toContain('disabled');
  });

  it('shows up button and target aria label when one-level up is available', () => {
    const html = renderNav({
      currentLabel: 'Chord Atlas',
      upTargetLabel: 'World Map',
      showUpControl: true,
      canGoUp: true,
    });
    expect(html).toContain('Chord Atlas');
    expect(html).toContain('space-nav-back-btn');
    expect(html).toContain('Go up to World Map');
    expect(html).not.toContain('disabled');
  });
});
