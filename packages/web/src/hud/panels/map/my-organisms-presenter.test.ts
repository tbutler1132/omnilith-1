import { describe, expect, it } from 'vitest';
import type { Relationship } from '../../../api/types.js';
import type { OrganismMarkerData } from '../../../hooks/use-organism.js';
import { isCadenceRelevantRelationship, presentMyCadenceOrganisms } from './my-organisms-presenter.js';

describe('isCadenceRelevantRelationship', () => {
  it('accepts stewardship and founder membership relationships', () => {
    const stewardship: Relationship = {
      id: 'rel-1',
      type: 'stewardship',
      userId: 'usr-1',
      organismId: 'org-1',
      createdAt: 1,
    };
    const founderMembership: Relationship = {
      id: 'rel-2',
      type: 'membership',
      userId: 'usr-1',
      organismId: 'org-2',
      role: 'founder',
      createdAt: 2,
    };
    const memberMembership: Relationship = {
      id: 'rel-3',
      type: 'membership',
      userId: 'usr-1',
      organismId: 'org-3',
      role: 'member',
      createdAt: 3,
    };

    expect(isCadenceRelevantRelationship(stewardship)).toBe(true);
    expect(isCadenceRelevantRelationship(founderMembership)).toBe(true);
    expect(isCadenceRelevantRelationship(memberMembership)).toBe(false);
  });
});

describe('presentMyCadenceOrganisms', () => {
  it('presents only steward/founder organisms with cadence children and visible markers', () => {
    const relationships: Relationship[] = [
      {
        id: 'rel-1',
        type: 'stewardship',
        userId: 'usr-1',
        organismId: 'org-alpha',
        createdAt: 1,
      },
      {
        id: 'rel-2',
        type: 'membership',
        userId: 'usr-1',
        organismId: 'org-alpha',
        role: 'founder',
        createdAt: 2,
      },
      {
        id: 'rel-3',
        type: 'membership',
        userId: 'usr-1',
        organismId: 'org-beta',
        role: 'member',
        createdAt: 3,
      },
      {
        id: 'rel-4',
        type: 'stewardship',
        userId: 'usr-1',
        organismId: 'org-hidden',
        createdAt: 4,
      },
      {
        id: 'rel-5',
        type: 'stewardship',
        userId: 'usr-1',
        organismId: 'org-no-cadence',
        createdAt: 5,
      },
    ];

    const markers: Record<string, OrganismMarkerData> = {
      'org-alpha': {
        kind: 'available',
        data: {
          organism: {
            id: 'org-alpha',
            name: 'Capital Community',
            createdAt: 1,
            createdBy: 'usr-1',
            openTrunk: true,
          },
          currentState: {
            id: 'state-1',
            organismId: 'org-alpha',
            contentTypeId: 'community',
            payload: {},
            createdAt: 1,
            createdBy: 'usr-1',
            sequenceNumber: 1,
          },
        },
      },
      'org-hidden': {
        kind: 'restricted',
      },
      'org-no-cadence': {
        kind: 'available',
        data: {
          organism: {
            id: 'org-no-cadence',
            name: 'Loose Notes',
            createdAt: 1,
            createdBy: 'usr-1',
            openTrunk: true,
          },
          currentState: {
            id: 'state-2',
            organismId: 'org-no-cadence',
            contentTypeId: 'text',
            payload: {},
            createdAt: 1,
            createdBy: 'usr-1',
            sequenceNumber: 1,
          },
        },
      },
    };

    const cadenceCountByParent = new Map<string, number>([
      ['org-alpha', 6],
      ['org-hidden', 4],
      ['org-no-cadence', 0],
    ]);

    const presented = presentMyCadenceOrganisms(relationships, markers, cadenceCountByParent);

    expect(presented).toEqual([
      {
        organismId: 'org-alpha',
        name: 'Capital Community',
        contentTypeId: 'community',
        roles: ['founder', 'steward'],
        cadenceChildCount: 6,
      },
    ]);
  });
});
