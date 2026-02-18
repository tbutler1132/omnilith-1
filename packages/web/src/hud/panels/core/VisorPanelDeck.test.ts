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
  interiorOrigin?: boolean;
}) {
  const template = resolvePanelVisorTemplate(input.templateContext);

  return renderToStaticMarkup(
    createElement(VisorPanelDeck, {
      title: 'Panel test',
      template,
      surfaced: false,
      openTrunk: false,
      canWrite: input.canWrite ?? true,
      interiorOrigin: input.interiorOrigin ?? false,
      templateValuesReady: input.templateValuesReady ?? false,
      preferredMainPanelId: input.preferredMainPanelId,
      onPromotePanel: () => {},
      onCollapseMainPanel: () => {},
      renderPanelBody: (panelId: HudPanelId) => createElement('div', null, `body-${panelId}`),
      renderSecondaryBody: (panelId: HudPanelId) => createElement('div', null, `secondary-${panelId}`),
    }),
  );
}

describe('VisorPanelDeck', () => {
  it('an organism template starts with only the tend chip collapsed', () => {
    const html = renderDeck({ templateContext: 'visor-organism', preferredMainPanelId: null });

    expect(html).toContain('Renderer preview');
    expect(html).not.toContain('Composition');
    expect(html).not.toContain('Open proposal');
    expect(html).not.toContain('State history');
    expect(html).not.toContain('visor-panel-main-slot');
  });

  it('an interior template renders collapsed tend actions through slot placement classes', () => {
    const html = renderDeck({ templateContext: 'interior', preferredMainPanelId: null });

    expect(html).toContain('visor-panel-collapsed-rail--viewport-bottom-left');
    expect(html).toContain('Collaborate here');
    expect(html).not.toContain('visor-panel-main-slot');
  });

  it('a map template keeps main empty until a panel is preferred', () => {
    const html = renderDeck({ templateContext: 'map', preferredMainPanelId: null });

    expect(html).toContain('Profile');
    expect(html).toContain('Proposals');
    expect(html).not.toContain('visor-panel-main-slot');
  });

  it('a preferred map panel renders in the main slot without bypassing the deck', () => {
    const html = renderDeck({ templateContext: 'map', preferredMainPanelId: 'my-proposals' });

    expect(html).toContain('<h4>Proposals</h4>');
    expect(html).toContain('body-my-proposals');
    expect(html).toContain('Collapse');
  });

  it('opening tend in organism context renders one secondary action card', () => {
    const html = renderDeck({ templateContext: 'visor-organism', preferredMainPanelId: 'organism' });

    expect(html).toContain('<h4>Renderer preview</h4>');
    expect(html).toContain('visor-panel-secondary-row');
    expect(html).toContain('Composition');
  });

  it('entered-organism visor context renders organism-nav in the secondary slot', () => {
    const html = renderDeck({
      templateContext: 'visor-organism',
      preferredMainPanelId: 'organism',
      interiorOrigin: true,
    });

    expect(html).toContain('Panel shortcuts');
    expect(html).toContain('secondary-organism-nav');
  });
});
