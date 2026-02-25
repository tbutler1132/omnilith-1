import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CadenceMarkdownPreview } from './cadence-markdown-preview.js';

describe('CadenceMarkdownPreview', () => {
  it('renders markdown headings, list items, and tables as structured markup', () => {
    const html = renderToStaticMarkup(
      createElement(CadenceMarkdownPreview, {
        content: [
          '# Capital Community Variables',
          '',
          '- Review sensor readings and open proposals.',
          '- Move follow-up actions to Tasks.',
          '',
          '| Variable | Current signal | Target range |',
          '| --- | --- | --- |',
          '| governance-load | 7 | 0-12 |',
        ].join('\n'),
      }),
    );

    expect(html).toContain('Capital Community Variables');
    expect(html).toContain('<ul');
    expect(html).toContain('<table');
    expect(html).toContain('<th>Variable</th>');
    expect(html).toContain('<td>governance-load</td>');
  });
});
