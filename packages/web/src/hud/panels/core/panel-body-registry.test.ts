import { describe, expect, it } from 'vitest';
import {
  MAP_PANEL_BODY_RENDERERS,
  UNIVERSAL_VISOR_PANEL_BODY_RENDERERS,
  VISOR_MAIN_PANEL_BODY_RENDERERS,
} from './panel-body-registry.js';
import { MAP_HUD_PANEL_IDS, UNIVERSAL_VISOR_HUD_PANEL_IDS, VISOR_MAIN_HUD_PANEL_IDS } from './panel-schema.js';

function sortedKeys(input: Record<string, unknown>): string[] {
  return Object.keys(input).sort((a, b) => a.localeCompare(b));
}

describe('panel body registry coverage', () => {
  it('registers a map body renderer for every map panel ID', () => {
    expect(sortedKeys(MAP_PANEL_BODY_RENDERERS)).toEqual([...MAP_HUD_PANEL_IDS].sort((a, b) => a.localeCompare(b)));
  });

  it('registers a universal visor body renderer for every universal visor panel ID', () => {
    expect(sortedKeys(UNIVERSAL_VISOR_PANEL_BODY_RENDERERS)).toEqual(
      [...UNIVERSAL_VISOR_HUD_PANEL_IDS].sort((a, b) => a.localeCompare(b)),
    );
  });

  it('registers a visor main body renderer for every main visor panel ID', () => {
    expect(sortedKeys(VISOR_MAIN_PANEL_BODY_RENDERERS)).toEqual(
      [...VISOR_MAIN_HUD_PANEL_IDS].sort((a, b) => a.localeCompare(b)),
    );
  });
});
