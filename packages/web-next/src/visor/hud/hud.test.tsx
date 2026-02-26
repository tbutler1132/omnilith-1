import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createEmptySpatialContext } from '../apps/spatial-context-contract.js';
import { VisorHud } from './hud.js';

function renderHud(
  input: Partial<{
    mode: 'closed' | 'open';
    appId: string | null;
    altitude: 'high' | 'mid' | 'close';
    showAltitudeControls: boolean;
    showCompass: boolean;
    navigationCurrentLabel: string;
    navigationUpTargetLabel: string | null;
    showNavigationUpControl: boolean;
    canGoUp: boolean;
  }> = {},
) {
  return renderToStaticMarkup(
    createElement(VisorHud, {
      mode: input.mode ?? 'closed',
      appId: input.appId ?? null,
      organismId: null,
      spatialContext: createEmptySpatialContext(),
      altitude: input.altitude ?? 'high',
      showAltitudeControls: input.showAltitudeControls ?? true,
      showCompass: input.showCompass ?? true,
      showLogoutButton: true,
      navigationCurrentLabel: input.navigationCurrentLabel ?? 'World Map',
      navigationUpTargetLabel: input.navigationUpTargetLabel ?? null,
      showNavigationUpControl: input.showNavigationUpControl ?? false,
      canGoUp: input.canGoUp ?? false,
      onChangeAltitude: () => {},
      onGoUp: () => {},
      onOpenApp: () => {},
      onOpenAppRequest: () => {},
      onCloseVisor: () => {},
      onLogout: () => {},
    }),
  );
}

describe('VisorHud', () => {
  it('renders closed HUD controls and map widgets', () => {
    const html = renderHud({ mode: 'closed', showCompass: true, showAltitudeControls: true });
    expect(html).toContain('Spatial navigation');
    expect(html).toContain('spatial-controls-slot');
    expect(html).toContain('spatial-altitude-slot');
    expect(html).toContain('Map readout');
    expect(html).toContain('Log out');
    expect(html).toContain('Map legend');
    expect(html).toContain('Open Profile app');
    expect(html).toContain('Open Organism app');
  });

  it('hides right-side widgets when compass lane is disabled', () => {
    const html = renderHud({ mode: 'closed', showCompass: false });
    expect(html).toContain('Log out');
    expect(html).toContain('Map readout');
    expect(html).not.toContain('Map legend');
    expect(html).not.toContain('Compass pointing north');
  });

  it('hides altitude slot when spatial altitude controls are disabled', () => {
    const html = renderHud({ mode: 'closed', showAltitudeControls: false });
    expect(html).not.toContain('spatial-altitude-slot');
    expect(html).not.toContain('Map readout');
  });

  it('renders open visor shell in open mode', () => {
    const html = renderHud({ mode: 'open', appId: 'profile' });
    expect(html).toContain('Open visor');
    expect(html).toContain('Visor apps');
    expect(html).toContain('Booting Profile');
    expect(html).toContain('Expand');
    expect(html).toContain('Collapse app rail');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('Close');
    expect(html).not.toContain('Map legend');
  });
});
