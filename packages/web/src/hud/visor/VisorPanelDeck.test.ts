import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { HudPanelId } from './panel-schema.js';
import { resolvePanelVisorTemplate } from './template-schema.js';
import { VisorPanelDeck } from './VisorPanelDeck.js';

function renderDeck(input: {
  templateContext: 'map' | 'interior' | 'visor-organism';
  preferredMainPanelId: HudPanelId | null;
  templateValuesReady?: boolean;
  canWrite?: boolean;
}) {
  const template = resolvePanelVisorTemplate(input.templateContext);

  return renderToStaticMarkup(
    createElement(VisorPanelDeck, {
      title: 'Panel test',
      template,
      surfaced: false,
      openTrunk: false,
      canWrite: input.canWrite ?? true,
      templateValuesReady: input.templateValuesReady ?? false,
      preferredMainPanelId: input.preferredMainPanelId,
      onPromotePanel: () => {},
      onCollapseMainPanel: () => {},
      renderPanelBody: (panelId: HudPanelId) => createElement('div', null, `body-${panelId}`),
    }),
  );
}

describe('VisorPanelDeck', () => {
  it('an interior template renders collapsed tend actions through slot placement classes', () => {
    const html = renderDeck({ templateContext: 'interior', preferredMainPanelId: null });

    expect(html).toContain('visor-panel-collapsed-rail--viewport-bottom-left');
    expect(html).toContain('Tend current');
    expect(html).not.toContain('visor-panel-main-slot');
  });

  it('a map template keeps main empty until a panel is preferred', () => {
    const html = renderDeck({ templateContext: 'map', preferredMainPanelId: null });

    expect(html).toContain('Templates');
    expect(html).toContain('Threshold');
    expect(html).toContain('My organisms');
    expect(html).not.toContain('visor-panel-main-slot');
  });

  it('a preferred map panel renders in the main slot without bypassing the deck', () => {
    const html = renderDeck({ templateContext: 'map', preferredMainPanelId: 'templates' });

    expect(html).toContain('<h4>Templates</h4>');
    expect(html).toContain('body-templates');
    expect(html).toContain('Collapse');
  });
});
