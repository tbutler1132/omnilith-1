import { describe, expect, it } from 'vitest';
import { presentMyProposals } from './my-proposals-presenter.js';

function buildProposal(input: { id: string; status: 'open' | 'integrated' | 'declined'; createdAt: number }) {
  return input;
}

describe('presentMyProposals', () => {
  it('groups proposals by status in open/integrated/declined order', () => {
    const groups = presentMyProposals([
      buildProposal({ id: '1', status: 'declined', createdAt: 1 }),
      buildProposal({ id: '2', status: 'open', createdAt: 2 }),
      buildProposal({ id: '3', status: 'integrated', createdAt: 3 }),
    ]);

    expect(groups.map((group) => group.status)).toEqual(['open', 'integrated', 'declined']);
    expect(groups.map((group) => group.label)).toEqual(['Open', 'Integrated', 'Declined']);
  });

  it('sorts each group by newest first and caps each group independently', () => {
    const openProposals = Array.from({ length: 12 }, (_, i) =>
      buildProposal({ id: `open-${i}`, status: 'open' as const, createdAt: i + 1 }),
    );
    const integratedProposals = [
      buildProposal({ id: 'int-1', status: 'integrated', createdAt: 3 }),
      buildProposal({ id: 'int-2', status: 'integrated', createdAt: 10 }),
    ];

    const groups = presentMyProposals([...openProposals, ...integratedProposals], { groupLimit: 10 });
    const openGroup = groups.find((group) => group.status === 'open');
    const integratedGroup = groups.find((group) => group.status === 'integrated');

    expect(openGroup).toBeDefined();
    expect(openGroup?.proposals).toHaveLength(10);
    expect(openGroup?.total).toBe(12);
    expect(openGroup?.hasMore).toBe(true);
    expect(openGroup?.proposals[0]?.id).toBe('open-11');
    expect(openGroup?.proposals[9]?.id).toBe('open-2');

    expect(integratedGroup?.proposals).toHaveLength(2);
    expect(integratedGroup?.hasMore).toBe(false);
    expect(integratedGroup?.proposals[0]?.id).toBe('int-2');
  });
});
