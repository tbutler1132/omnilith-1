import { describe, expect, it } from 'vitest';
import { fallbackMainPanel, resolveVisorPanelLayout } from './panel-layout-policy.js';
import { resolveVisorTemplate } from './template-schema.js';

const organismSlots = resolveVisorTemplate('visor-organism').panelSlots;
const mapSlots = resolveVisorTemplate('map').panelSlots;
const interiorSlots = resolveVisorTemplate('interior').panelSlots;

describe('resolveVisorPanelLayout', () => {
  it('a surfaced regulated organism resolves deterministic main secondary collapsed roles', () => {
    const layout = resolveVisorPanelLayout({
      context: {
        contextClass: 'visor-organism',
        surfaced: true,
        openTrunk: false,
        templateValuesReady: false,
        canWrite: true,
      },
      preferredMainPanelId: null,
      slots: organismSlots,
    });

    expect(layout.mainPanelId).toBe('organism');
    expect(layout.secondaryPanelIds).toEqual([]);
    expect(layout.collapsedPanelIds).toEqual(['composition', 'vitality', 'proposals', 'governance', 'history']);
  });

  it('an open-trunk organism omits proposals from available panels', () => {
    const layout = resolveVisorPanelLayout({
      context: {
        contextClass: 'visor-organism',
        surfaced: true,
        openTrunk: true,
        templateValuesReady: false,
        canWrite: true,
      },
      preferredMainPanelId: null,
      slots: organismSlots,
    });

    expect(layout.availablePanelIds).toEqual(['organism', 'composition', 'vitality', 'history', 'governance']);
    expect(layout.secondaryPanelIds).toEqual([]);
    expect(layout.collapsedPanelIds).not.toContain('proposals');
  });

  it('an organism context defaults to tend as the main panel', () => {
    const layout = resolveVisorPanelLayout({
      context: {
        contextClass: 'visor-organism',
        surfaced: false,
        openTrunk: false,
        templateValuesReady: false,
        canWrite: true,
      },
      preferredMainPanelId: null,
      slots: organismSlots,
    });

    expect(layout.mainPanelId).toBe('organism');
  });

  it('preferred main panel is preserved when still available', () => {
    const layout = resolveVisorPanelLayout({
      context: {
        contextClass: 'visor-organism',
        surfaced: false,
        openTrunk: false,
        templateValuesReady: false,
        canWrite: true,
      },
      preferredMainPanelId: 'history',
      slots: organismSlots,
    });

    expect(layout.mainPanelId).toBe('history');
  });

  it('fallback main panel chooses the highest ranked panel deterministically', () => {
    expect(fallbackMainPanel(['governance', 'history', 'vitality'])).toBe('vitality');
  });

  it('map context supports panel availability with empty main until promoted', () => {
    const layout = resolveVisorPanelLayout({
      context: { contextClass: 'map', surfaced: false, openTrunk: false, templateValuesReady: false, canWrite: true },
      preferredMainPanelId: null,
      slots: mapSlots,
    });

    expect(layout.availablePanelIds).toEqual(['templates', 'threshold', 'mine']);
    expect(layout.mainPanelId).toBeNull();
    expect(layout.secondaryPanelIds).toEqual([]);
    expect(layout.collapsedPanelIds).toEqual(['templates', 'threshold', 'mine']);
  });

  it('secondary slot count is template-driven and can enable secondary cards', () => {
    const layout = resolveVisorPanelLayout({
      context: {
        contextClass: 'visor-organism',
        surfaced: true,
        openTrunk: false,
        templateValuesReady: false,
        canWrite: true,
      },
      preferredMainPanelId: 'organism',
      slots: {
        ...organismSlots,
        secondary: { enabled: true, maxPanels: 1 },
      },
    });

    expect(layout.secondaryPanelIds).toEqual(['composition']);
  });

  it('an interior context uses the same policy path with collapsed-only tend actions', () => {
    const layout = resolveVisorPanelLayout({
      context: {
        contextClass: 'interior',
        surfaced: false,
        openTrunk: false,
        templateValuesReady: false,
        canWrite: true,
      },
      preferredMainPanelId: null,
      slots: interiorSlots,
    });

    expect(layout.mainPanelId).toBeNull();
    expect(layout.secondaryPanelIds).toEqual([]);
    expect(layout.collapsedPanelIds).toEqual(['interior-actions']);
  });

  it('a guest map context has no write panels available', () => {
    const layout = resolveVisorPanelLayout({
      context: { contextClass: 'map', surfaced: false, openTrunk: false, templateValuesReady: false, canWrite: false },
      preferredMainPanelId: null,
      slots: mapSlots,
    });

    expect(layout.availablePanelIds).toEqual([]);
    expect(layout.collapsedPanelIds).toEqual([]);
  });
});
