import { describe, expect, it } from 'vitest';
import { groupBoundaryCadenceChildrenByTab, presentBoundaryCadenceChildren } from './boundary-cadence-presenter.js';

describe('presentBoundaryCadenceChildren', () => {
  it('returns cadence children in composition order using canonical suffix names', () => {
    const presented = presentBoundaryCadenceChildren([
      {
        childId: 'org-variables',
        name: 'capital-community-variables',
        contentTypeId: 'text',
        payload: {
          content: '# Capital Community Variables',
          format: 'markdown',
        },
      },
      {
        childId: 'org-sensor',
        name: 'capital-community-load-sensor',
        contentTypeId: 'sensor',
        payload: {},
      },
      {
        childId: 'org-trajectory',
        name: 'capital-community-trajectory',
        contentTypeId: 'text',
        payload: {
          content: '# Capital Community Trajectory',
          format: 'markdown',
        },
      },
    ]);

    expect(presented).toEqual([
      {
        tabId: 'variables',
        childId: 'org-variables',
        name: 'capital-community-variables',
        contentTypeId: 'text',
        payload: {
          content: '# Capital Community Variables',
          format: 'markdown',
        },
      },
      {
        tabId: 'trajectory',
        childId: 'org-trajectory',
        name: 'capital-community-trajectory',
        contentTypeId: 'text',
        payload: {
          content: '# Capital Community Trajectory',
          format: 'markdown',
        },
      },
    ]);
  });

  it('maps children by heading suffix when names do not include cadence suffixes', () => {
    const presented = presentBoundaryCadenceChildren([
      {
        childId: 'org-retro',
        name: 'weekly-learning-journal',
        contentTypeId: 'text',
        payload: {
          content: '# Capital Community Retros\n\n### Intentions',
          format: 'markdown',
        },
      },
      {
        childId: 'org-task',
        name: 'working-board',
        contentTypeId: 'text',
        payload: {
          content: '# Capital Community Tasks\n\n## Now',
          format: 'markdown',
        },
      },
    ]);

    const grouped = groupBoundaryCadenceChildrenByTab(presented);
    expect(grouped).toEqual([
      { tabId: 'trajectory', children: [] },
      { tabId: 'variables', children: [] },
      { tabId: 'models', children: [] },
      {
        tabId: 'retros',
        children: [
          {
            tabId: 'retros',
            childId: 'org-retro',
            name: 'weekly-learning-journal',
            contentTypeId: 'text',
            payload: {
              content: '# Capital Community Retros\n\n### Intentions',
              format: 'markdown',
            },
          },
        ],
      },
      {
        tabId: 'tasks',
        children: [
          {
            tabId: 'tasks',
            childId: 'org-task',
            name: 'working-board',
            contentTypeId: 'text',
            payload: {
              content: '# Capital Community Tasks\n\n## Now',
              format: 'markdown',
            },
          },
        ],
      },
      { tabId: 'inbox', children: [] },
    ]);
  });
});
