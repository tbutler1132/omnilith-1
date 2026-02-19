import { describe, expect, it } from 'vitest';
import { fallbackMainPanel, resolveVisorPanelLayout } from './panel-layout-policy.js';
import { resolveVisorTemplate } from './template-schema.js';

const organismSlots = resolveVisorTemplate('visor-organism').panelSlots;
const mapSlots = resolveVisorTemplate('map').panelSlots;
const interiorSlots = resolveVisorTemplate('interior').panelSlots;

describe('resolveVisorPanelLayout', () => {
  it('a regulated organism starts with collapsed tend and no main panel', () => {
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

    expect(layout.mainPanelId).toBeNull();
    expect(layout.secondaryPanelIds).toEqual([]);
    expect(layout.collapsedPanelIds).toEqual(['organism']);
  });

  it('opening tend reveals universal regulated panels as collapsed alternatives', () => {
    const layout = resolveVisorPanelLayout({
      context: {
        contextClass: 'visor-organism',
        surfaced: true,
        openTrunk: false,
        templateValuesReady: false,
        canWrite: true,
      },
      preferredMainPanelId: 'organism',
      slots: organismSlots,
    });

    expect(layout.mainPanelId).toBe('organism');
    expect(layout.secondaryPanelIds).toEqual(['composition']);
    expect(layout.collapsedPanelIds).toEqual([
      'proposals',
      'propose',
      'contributions',
      'relationships',
      'governance',
      'history',
    ]);
  });

  it('thermal renderer preview promotes components into the secondary slot', () => {
    const layout = resolveVisorPanelLayout({
      context: {
        contextClass: 'visor-organism',
        surfaced: true,
        openTrunk: false,
        templateValuesReady: false,
        canWrite: true,
        interiorOrigin: true,
        thermalRendererPreview: true,
      },
      preferredMainPanelId: 'organism',
      slots: organismSlots,
    });

    expect(layout.mainPanelId).toBe('organism');
    expect(layout.secondaryPanelIds).toEqual(['components']);
    expect(layout.availablePanelIds).not.toContain('relationships');
    expect(layout.availablePanelIds).not.toContain('governance');
    expect(layout.availablePanelIds).not.toContain('history');
    expect(layout.availablePanelIds).toContain('contributions');
    expect(layout.collapsedPanelIds).toContain('composition');
    expect(layout.collapsedPanelIds).toContain('contributions');
  });

  it('true renderer preview suppresses secondary panels for full-width focus', () => {
    const layout = resolveVisorPanelLayout({
      context: {
        contextClass: 'visor-organism',
        surfaced: true,
        openTrunk: false,
        templateValuesReady: false,
        canWrite: true,
        rendererPreviewFullBleed: true,
      },
      preferredMainPanelId: 'organism',
      slots: organismSlots,
    });

    expect(layout.mainPanelId).toBe('organism');
    expect(layout.secondaryPanelIds).toEqual([]);
  });

  it('an open-trunk organism exposes append and omits regulated proposal panels', () => {
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

    expect(layout.availablePanelIds).toEqual([
      'organism',
      'composition',
      'append',
      'relationships',
      'contributions',
      'history',
      'governance',
    ]);
    expect(layout.secondaryPanelIds).toEqual([]);
    expect(layout.collapsedPanelIds).toEqual(['organism']);
  });

  it('opening tend on open-trunk reveals append alongside other universal panels', () => {
    const layout = resolveVisorPanelLayout({
      context: {
        contextClass: 'visor-organism',
        surfaced: true,
        openTrunk: true,
        templateValuesReady: false,
        canWrite: true,
      },
      preferredMainPanelId: 'organism',
      slots: organismSlots,
    });

    expect(layout.secondaryPanelIds).toEqual(['composition']);
    expect(layout.collapsedPanelIds).toEqual(['append', 'contributions', 'relationships', 'governance', 'history']);
  });

  it('an organism context keeps main empty until a panel is promoted', () => {
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

    expect(layout.mainPanelId).toBeNull();
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
    expect(fallbackMainPanel(['governance', 'history', 'propose'])).toBe('propose');
  });

  it('map context supports panel availability with empty main until promoted', () => {
    const layout = resolveVisorPanelLayout({
      context: { contextClass: 'map', surfaced: false, openTrunk: false, templateValuesReady: false, canWrite: true },
      preferredMainPanelId: null,
      slots: mapSlots,
    });

    expect(layout.availablePanelIds).toEqual(['profile', 'my-proposals']);
    expect(layout.mainPanelId).toBeNull();
    expect(layout.secondaryPanelIds).toEqual([]);
    expect(layout.collapsedPanelIds).toEqual(['my-proposals', 'profile']);
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

  it('a guest map context still exposes profile and proposals panels', () => {
    const layout = resolveVisorPanelLayout({
      context: { contextClass: 'map', surfaced: false, openTrunk: false, templateValuesReady: false, canWrite: false },
      preferredMainPanelId: null,
      slots: mapSlots,
    });

    expect(layout.availablePanelIds).toEqual(['profile', 'my-proposals']);
    expect(layout.collapsedPanelIds).toEqual(['my-proposals', 'profile']);
  });
});
