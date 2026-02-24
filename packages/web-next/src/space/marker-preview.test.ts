import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MarkerPreview } from './marker-preview.js';

function renderPreview(contentTypeId: string | null, payload: unknown): string {
  return renderToStaticMarkup(createElement(MarkerPreview, { contentTypeId, payload }));
}

describe('MarkerPreview', () => {
  it('renders normalized text previews for text organisms', () => {
    const html = renderPreview('text', {
      content: '# Field Note\n\nThe canopy opens and light settles.',
    });

    expect(html).toContain('Field Note The canopy opens and light settles.');
    expect(html).not.toContain('#');
  });

  it('clips long text previews to a concise snippet', () => {
    const html = renderPreview('text', {
      content: `# Note\n\n${'a'.repeat(240)}`,
    });

    expect(html).toContain('...');
  });

  it('renders community description previews', () => {
    const html = renderPreview('community', {
      description: 'A boundary for shared tending and proposals.',
    });

    expect(html).toContain('A boundary for shared tending and proposals.');
  });

  it('renders map and fallback preview labels', () => {
    expect(renderPreview('spatial-map', {})).toContain('Spatial map boundary');
    expect(renderPreview('unknown-type', {})).toContain('No preview yet');
  });
});
