import { describe, expect, it } from 'vitest';
import { presentRelationships } from './relationships-presenter.js';

describe('presentRelationships', () => {
  it('orders relationships by type priority then newest first', () => {
    const presented = presentRelationships([
      {
        id: 'rel_3',
        type: 'membership',
        userId: 'usr_member',
        organismId: 'org_1',
        role: 'member',
        createdAt: Date.parse('2026-02-10T00:00:00.000Z'),
      },
      {
        id: 'rel_1',
        type: 'stewardship',
        userId: 'usr_steward',
        organismId: 'org_1',
        createdAt: Date.parse('2026-02-01T00:00:00.000Z'),
      },
      {
        id: 'rel_2',
        type: 'integration-authority',
        userId: 'usr_integrator',
        organismId: 'org_1',
        createdAt: Date.parse('2026-02-15T00:00:00.000Z'),
      },
    ]);

    expect(presented.map((row) => row.id)).toEqual(['rel_1', 'rel_2', 'rel_3']);
  });

  it('formats labels and role metadata', () => {
    const [row] = presentRelationships([
      {
        id: 'rel_4',
        type: 'membership',
        userId: 'usr_1234567890abcdef',
        organismId: 'org_2',
        role: 'founder',
        createdAt: Date.parse('2026-02-16T12:34:56.000Z'),
      },
    ]);

    expect(row.typeLabel).toBe('Membership');
    expect(row.roleLabel).toBe('founder');
    expect(row.userLabel).toBe('usr_12345678');
    expect(row.createdAtLabel).toBe('2026-02-16');
  });

  it('shows unknown when createdAt is invalid', () => {
    const [row] = presentRelationships([
      {
        id: 'rel_5',
        type: 'stewardship',
        userId: 'usr_1',
        organismId: 'org_2',
        createdAt: Number.NaN,
      },
    ]);

    expect(row.createdAtLabel).toBe('unknown');
  });
});
