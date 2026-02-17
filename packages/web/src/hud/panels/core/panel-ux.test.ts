import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  PanelCardEmpty,
  PanelCardErrorWithAction,
  PanelInfoAuthRequired,
  PanelInfoEmpty,
  PanelInfoError,
  PanelInfoLoading,
  PanelSection,
} from './panel-ux.js';

describe('panel ux primitives', () => {
  it('renders shared info states with the expected section classes', () => {
    const html = renderToStaticMarkup(
      createElement('div', null, [
        createElement(PanelInfoLoading, { key: 'loading', label: 'State history', message: 'Loading...' }),
        createElement(PanelInfoEmpty, { key: 'empty', label: 'State history', message: 'No states.' }),
        createElement(PanelInfoAuthRequired, {
          key: 'auth',
          label: 'Open proposal',
          message: 'Log in to open proposals.',
        }),
        createElement(PanelInfoError, { key: 'error', label: 'Proposals', message: 'Failed.' }),
      ]),
    );

    expect(html).toContain('hud-info-section');
    expect(html).toContain('hud-info-label');
    expect(html).toContain('hud-info-dim');
    expect(html).toContain('hud-info-error');
  });

  it('renders card-level states with optional retry action', () => {
    const html = renderToStaticMarkup(
      createElement('div', null, [
        createElement(PanelCardEmpty, { key: 'empty', title: 'Templates', message: 'No templates.' }),
        createElement(PanelCardErrorWithAction, {
          key: 'error',
          title: 'My Organisms',
          message: 'Could not load your organisms.',
          actionLabel: 'Retry',
          onAction: () => {},
        }),
      ]),
    );

    expect(html).toContain('hud-my-organisms-state');
    expect(html).toContain('Retry');
  });

  it('renders panel section wrapper around content', () => {
    const html = renderToStaticMarkup(
      createElement(
        PanelSection,
        { label: 'Proposals' },
        createElement('span', { className: 'hud-info-dim' }, 'No proposals.'),
      ),
    );

    expect(html).toContain('hud-info-section');
    expect(html).toContain('Proposals');
    expect(html).toContain('No proposals.');
  });
});
