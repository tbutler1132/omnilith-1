/**
 * My proposals presenter — groups authored proposals for map panel rendering.
 *
 * Keeps sort, group, and cap logic outside React so the proposals panel
 * can stay rendering-focused and test behavior in isolation.
 */

export type ProposalStatus = 'open' | 'integrated' | 'declined';

export interface ProposalLike {
  id: string;
  status: ProposalStatus;
  createdAt: number;
}

export interface PresentMyProposalsOptions {
  groupLimit?: number;
}

export interface PresentedProposalGroup<TProposal extends ProposalLike> {
  status: ProposalStatus;
  label: string;
  allProposals: TProposal[];
  proposals: TProposal[];
  total: number;
  hasMore: boolean;
}

const DEFAULT_GROUP_LIMIT = 10;
const STATUS_ORDER: ProposalStatus[] = ['open', 'integrated', 'declined'];

function statusLabel(status: ProposalStatus): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'integrated':
      return 'Integrated';
    case 'declined':
      return 'Declined';
  }
}

export function presentMyProposals<TProposal extends ProposalLike>(
  proposals: readonly TProposal[],
  options: PresentMyProposalsOptions = {},
): PresentedProposalGroup<TProposal>[] {
  const groupLimit = options.groupLimit ?? DEFAULT_GROUP_LIMIT;
  const grouped = new Map<ProposalStatus, TProposal[]>();

  for (const status of STATUS_ORDER) {
    grouped.set(status, []);
  }

  for (const proposal of proposals) {
    const list = grouped.get(proposal.status);
    if (!list) continue;
    list.push(proposal);
  }

  return STATUS_ORDER.map((status) => {
    const sorted = [...(grouped.get(status) ?? [])].sort((a, b) => b.createdAt - a.createdAt);
    return {
      status,
      label: statusLabel(status),
      allProposals: sorted,
      proposals: sorted.slice(0, groupLimit),
      total: sorted.length,
      hasMore: sorted.length > groupLimit,
    };
  });
}
