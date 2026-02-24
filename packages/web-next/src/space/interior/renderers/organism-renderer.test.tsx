import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OrganismRenderer } from './organism-renderer.js';

describe('OrganismRenderer', () => {
  it('routes text content to the text organism renderer', () => {
    const html = renderToStaticMarkup(
      createElement(OrganismRenderer, {
        contentTypeId: 'text',
        payload: {
          format: 'markdown',
          content: '# Field Note\n\nWe entered the boundary.',
        },
      }),
    );

    expect(html).toContain('text-heading-1');
    expect(html).toContain('Field Note');
    expect(html).toContain('We entered the boundary.');
  });

  it('routes unknown content to fallback renderer', () => {
    const html = renderToStaticMarkup(
      createElement(OrganismRenderer, {
        contentTypeId: 'spatial-map',
        payload: { width: 5000, height: 5000 },
      }),
    );

    expect(html).toContain('Renderer pending for: spatial-map');
    expect(html).toContain('5000');
  });
});
