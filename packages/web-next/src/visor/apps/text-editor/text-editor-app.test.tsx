import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptySpatialContext } from '../spatial-context-contract.js';
import { TextEditorApp } from './text-editor-app.js';

interface MockTextEditorState {
  readonly data: {
    readonly targetOrganismId: string;
    readonly organism: {
      readonly id: string;
      readonly name: string;
      readonly openTrunk?: boolean;
    };
    readonly currentState: {
      readonly contentTypeId: string;
      readonly payload: unknown;
    } | null;
  } | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly reload: () => void;
}

let mockTextEditorState: MockTextEditorState = {
  data: null,
  loading: false,
  error: null,
  reload: () => {},
};
let requestedOrganismId: string | null = null;

vi.mock('./use-text-editor-data.js', () => ({
  useTextEditorData: (targetedOrganismId: string | null) => {
    requestedOrganismId = targetedOrganismId;
    return mockTextEditorState;
  },
}));

describe('TextEditorApp', () => {
  beforeEach(() => {
    mockTextEditorState = {
      data: null,
      loading: false,
      error: null,
      reload: () => {},
    };
    requestedOrganismId = null;
  });

  it('renders guidance when no organism is targeted', () => {
    const html = renderToStaticMarkup(
      createElement(TextEditorApp, {
        onRequestClose: () => {},
        organismId: null,
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Enter an organism to edit text.');
    expect(requestedOrganismId).toBeNull();
  });

  it('renders unsupported message for non-text targets', () => {
    mockTextEditorState = {
      data: {
        targetOrganismId: 'org-1',
        organism: {
          id: 'org-1',
          name: 'Map Target',
          openTrunk: true,
        },
        currentState: {
          contentTypeId: 'spatial-map',
          payload: { entries: [] },
        },
      },
      loading: false,
      error: null,
      reload: () => {},
    };

    const html = renderToStaticMarkup(
      createElement(TextEditorApp, {
        onRequestClose: () => {},
        organismId: 'org-1',
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Text editor supports text organisms only.');
    expect(requestedOrganismId).toBe('org-1');
  });

  it('renders textarea and save control for editable text targets', () => {
    mockTextEditorState = {
      data: {
        targetOrganismId: 'org-2',
        organism: {
          id: 'org-2',
          name: 'Field Note',
          openTrunk: true,
        },
        currentState: {
          contentTypeId: 'text',
          payload: {
            content: '# Field Note\n\nTending update.',
            format: 'markdown',
          },
        },
      },
      loading: false,
      error: null,
      reload: () => {},
    };

    const html = renderToStaticMarkup(
      createElement(TextEditorApp, {
        onRequestClose: () => {},
        organismId: 'org-2',
        spatialContext: createEmptySpatialContext(),
        onSpatialContextChanged: () => () => {},
      }),
    );

    expect(html).toContain('Text Editor');
    expect(html).toContain('Looking at:');
    expect(html).toContain('Field Note');
    expect(html).toContain('Content type:');
    expect(html).toContain('Save');
    expect(html).toContain('textarea');
  });
});
