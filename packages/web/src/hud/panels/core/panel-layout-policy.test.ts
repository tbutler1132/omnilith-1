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

  it('opening tend keeps alternate panels collapsed for stable quick switching', () => {
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
    expect(layout.secondaryPanelIds).toEqual([]);
    expect(layout.collapsedPanelIds).toEqual(['proposals', 'boundary-cadence', 'regulation']);
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

  it('an open-trunk organism keeps only overview and regulation available', () => {
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

    expect(layout.availablePanelIds).toEqual(['organism', 'regulation', 'boundary-cadence']);
    expect(layout.secondaryPanelIds).toEqual([]);
    expect(layout.collapsedPanelIds).toEqual(['organism']);
  });

  it('opening tend on open-trunk keeps regulation collapsed', () => {
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

    expect(layout.secondaryPanelIds).toEqual([]);
    expect(layout.collapsedPanelIds).toEqual(['boundary-cadence', 'regulation']);
  });

  it('a regulated boundary always exposes the regulation panel', () => {
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

    expect(layout.availablePanelIds).toContain('regulation');
    expect(layout.collapsedPanelIds).toContain('regulation');
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
      preferredMainPanelId: 'proposals',
      slots: organismSlots,
    });

    expect(layout.mainPanelId).toBe('proposals');
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

    expect(layout.availablePanelIds).toEqual(['profile', 'my-proposals', 'my-organisms']);
    expect(layout.mainPanelId).toBeNull();
    expect(layout.secondaryPanelIds).toEqual([]);
    expect(layout.collapsedPanelIds).toEqual(['my-organisms', 'my-proposals', 'profile']);
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

    expect(layout.secondaryPanelIds).toEqual(['proposals']);
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

  it('an interior-origin organism context keeps alternate panels collapsed instead of secondary', () => {
    const layout = resolveVisorPanelLayout({
      context: {
        contextClass: 'visor-organism',
        surfaced: true,
        openTrunk: false,
        templateValuesReady: false,
        canWrite: true,
        interiorOrigin: true,
      },
      preferredMainPanelId: 'organism',
      slots: organismSlots,
    });

    expect(layout.availablePanelIds).toEqual(['organism', 'regulation', 'boundary-cadence', 'proposals']);
    expect(layout.secondaryPanelIds).toEqual([]);
    expect(layout.collapsedPanelIds).toEqual(['proposals', 'boundary-cadence', 'regulation']);
  });

  it('a guest map context still exposes profile and proposals panels', () => {
    const layout = resolveVisorPanelLayout({
      context: { contextClass: 'map', surfaced: false, openTrunk: false, templateValuesReady: false, canWrite: false },
      preferredMainPanelId: null,
      slots: mapSlots,
    });

    expect(layout.availablePanelIds).toEqual(['profile', 'my-proposals', 'my-organisms']);
    expect(layout.collapsedPanelIds).toEqual(['my-organisms', 'my-proposals', 'profile']);
  });
});
