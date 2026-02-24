import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VisorHud } from './hud.js';

function renderHud(
  input: Partial<{
    mode: 'closed' | 'open';
    appId: string | null;
    altitude: 'high' | 'mid' | 'close';
    showAltitudeControls: boolean;
    showCompass: boolean;
    navigationLabel: string | null;
  }> = {},
) {
  return renderToStaticMarkup(
    createElement(VisorHud, {
      mode: input.mode ?? 'closed',
      appId: input.appId ?? null,
      altitude: input.altitude ?? 'high',
      showAltitudeControls: input.showAltitudeControls ?? true,
      showCompass: input.showCompass ?? true,
      navigationLabel: input.navigationLabel ?? null,
      canGoBack: true,
      onChangeAltitude: () => {},
      onGoBack: () => {},
      onOpenApp: () => {},
      onCloseVisor: () => {},
    }),
  );
}

describe('VisorHud', () => {
  it('renders closed HUD controls and map widgets', () => {
    const html = renderHud({ mode: 'closed', showCompass: true, showAltitudeControls: true });
    expect(html).toContain('Spatial navigation');
    expect(html).toContain('Map legend');
    expect(html).toContain('Open Profile app');
  });

  it('hides right-side widgets when compass lane is disabled', () => {
    const html = renderHud({ mode: 'closed', showCompass: false });
    expect(html).not.toContain('Map legend');
    expect(html).not.toContain('Compass pointing north');
  });

  it('renders open visor shell in open mode', () => {
    const html = renderHud({ mode: 'open', appId: 'profile' });
    expect(html).toContain('Open visor');
    expect(html).toContain('Visor apps');
    expect(html).toContain('Close');
    expect(html).not.toContain('Map legend');
  });
});
