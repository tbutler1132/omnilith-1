import { describe, expect, it } from 'vitest';
import type { OrganismMarkerData } from '../../../../hooks/use-organism.js';
import { groupBoundaryCadenceChildrenByTab, presentBoundaryCadenceChildren } from './boundary-cadence-presenter.js';

describe('presentBoundaryCadenceChildren', () => {
  it('returns cadence children in composition order using canonical suffix names', () => {
    const markers: Record<string, OrganismMarkerData> = {
      'org-trajectory': {
        kind: 'available',
        data: {
          organism: {
            id: 'org-trajectory',
            name: 'capital-community-trajectory',
            createdAt: 1,
            createdBy: 'usr-1',
            openTrunk: true,
          },
          currentState: {
            id: 'state-1',
            organismId: 'org-trajectory',
            contentTypeId: 'text',
            payload: {
              content: '# Capital Community Trajectory',
              format: 'markdown',
            },
            createdAt: 1,
            createdBy: 'usr-1',
            sequenceNumber: 1,
          },
        },
      },
      'org-variables': {
        kind: 'available',
        data: {
          organism: {
            id: 'org-variables',
            name: 'capital-community-variables',
            createdAt: 1,
            createdBy: 'usr-1',
            openTrunk: true,
          },
          currentState: {
            id: 'state-2',
            organismId: 'org-variables',
            contentTypeId: 'text',
            payload: {
              content: '# Capital Community Variables',
              format: 'markdown',
            },
            createdAt: 1,
            createdBy: 'usr-1',
            sequenceNumber: 1,
          },
        },
      },
      'org-restricted': {
        kind: 'restricted',
      },
      'org-sensor': {
        kind: 'available',
        data: {
          organism: {
            id: 'org-sensor',
            name: 'capital-load-sensor',
            createdAt: 1,
            createdBy: 'usr-1',
            openTrunk: true,
          },
          currentState: {
            id: 'state-3',
            organismId: 'org-sensor',
            contentTypeId: 'sensor',
            payload: {},
            createdAt: 1,
            createdBy: 'usr-1',
            sequenceNumber: 1,
          },
        },
      },
    };

    const presented = presentBoundaryCadenceChildren(
      ['org-variables', 'org-sensor', 'org-restricted', 'org-trajectory'],
      markers,
    );

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

  it('maps children by heading suffix when names do not include canonical cadence suffixes', () => {
    const markers: Record<string, OrganismMarkerData> = {
      'org-retro': {
        kind: 'available',
        data: {
          organism: {
            id: 'org-retro',
            name: 'weekly-learning-journal',
            createdAt: 1,
            createdBy: 'usr-1',
            openTrunk: true,
          },
          currentState: {
            id: 'state-1',
            organismId: 'org-retro',
            contentTypeId: 'text',
            payload: {
              content: '# Capital Community Retros\n\n### Intentions',
              format: 'markdown',
            },
            createdAt: 1,
            createdBy: 'usr-1',
            sequenceNumber: 1,
          },
        },
      },
      'org-task': {
        kind: 'available',
        data: {
          organism: {
            id: 'org-task',
            name: 'working-board',
            createdAt: 1,
            createdBy: 'usr-1',
            openTrunk: true,
          },
          currentState: {
            id: 'state-2',
            organismId: 'org-task',
            contentTypeId: 'text',
            payload: {
              content: '# Capital Community Tasks\n\n## Now',
              format: 'markdown',
            },
            createdAt: 1,
            createdBy: 'usr-1',
            sequenceNumber: 1,
          },
        },
      },
    };

    const presented = presentBoundaryCadenceChildren(['org-retro', 'org-task'], markers);
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
