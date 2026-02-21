import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../api/client.js';
import {
  MAP_PANEL_BODY_RENDERERS,
  renderVisorPanelBody,
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

  it('organism overview header shows name, content type, and child count', () => {
    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        renderVisorPanelBody('organism', {
          organismMain: {
            name: 'Rain Garden',
            contentType: 'text/markdown',
            childCountLabel: '3',
            organismLoading: false,
            childrenLoading: false,
            hasCurrentState: true,
            payload: { body: 'hello world' },
          },
          universal: {
            organismId: 'org_1',
            refreshKey: 0,
            canWrite: true,
            onMutate: () => {},
          },
        }),
      ),
    );

    expect(html).toContain('Overview');
    expect(html).toContain('Name:');
    expect(html).toContain('Rain Garden');
    expect(html).toContain('Content Type:');
    expect(html).toContain('text/markdown');
    expect(html).toContain('Children:');
    expect(html).toContain('3');
    expect(html).toContain('hello world');
  });

  it('organism overview shows auth-required state for forbidden reads', () => {
    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        renderVisorPanelBody('organism', {
          organismMain: {
            name: 'Restricted',
            contentType: 'text/markdown',
            childCountLabel: 'unknown',
            organismLoading: false,
            childrenLoading: false,
            organismError: new ApiError(403, 'Forbidden'),
            hasCurrentState: false,
            payload: undefined,
          },
          universal: {
            organismId: 'org_2',
            refreshKey: 0,
            canWrite: false,
            onMutate: () => {},
          },
        }),
      ),
    );

    expect(html).toContain('Log in to inspect this overview.');
  });
});
