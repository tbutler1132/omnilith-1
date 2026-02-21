import { describe, expect, it } from 'vitest';
import type { OrganismMarkerData } from '../../../../hooks/use-organism.js';
import { presentRegulatoryChildren } from './regulation-presenter.js';

describe('presentRegulatoryChildren', () => {
  it('returns only visible children with regulatory content types in composition order', () => {
    const markers: Record<string, OrganismMarkerData> = {
      'org-sensor': {
        kind: 'available',
        data: {
          organism: {
            id: 'org-sensor',
            name: 'Repository Issue Sensor',
            createdAt: 1,
            createdBy: 'usr-1',
            openTrunk: true,
          },
          currentState: {
            id: 'state-1',
            organismId: 'org-sensor',
            contentTypeId: 'sensor',
            payload: {},
            createdAt: 1,
            createdBy: 'usr-1',
            sequenceNumber: 1,
          },
        },
      },
      'org-text': {
        kind: 'available',
        data: {
          organism: {
            id: 'org-text',
            name: 'Notes',
            createdAt: 1,
            createdBy: 'usr-1',
            openTrunk: true,
          },
          currentState: {
            id: 'state-2',
            organismId: 'org-text',
            contentTypeId: 'text',
            payload: {},
            createdAt: 1,
            createdBy: 'usr-1',
            sequenceNumber: 1,
          },
        },
      },
      'org-policy': {
        kind: 'available',
        data: {
          organism: {
            id: 'org-policy',
            name: 'Repository Response Policy',
            createdAt: 1,
            createdBy: 'usr-1',
            openTrunk: true,
          },
          currentState: {
            id: 'state-3',
            organismId: 'org-policy',
            contentTypeId: 'response-policy',
            payload: {},
            createdAt: 1,
            createdBy: 'usr-1',
            sequenceNumber: 1,
          },
        },
      },
      'org-restricted': {
        kind: 'restricted',
      },
    };

    const present = presentRegulatoryChildren(['org-policy', 'org-text', 'org-restricted', 'org-sensor'], markers);

    expect(present).toEqual([
      {
        childId: 'org-policy',
        contentTypeId: 'response-policy',
        name: 'Repository Response Policy',
      },
      {
        childId: 'org-sensor',
        contentTypeId: 'sensor',
        name: 'Repository Issue Sensor',
      },
    ]);
  });
});
