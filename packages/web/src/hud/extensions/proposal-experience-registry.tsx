/**
 * Proposal experience registry — resolves proposal panel rendering behavior.
 *
 * Keeps the default proposal flow intact while introducing a narrow extension
 * seam for future installable visor/HUD proposal experiences.
 */

import type { ReactNode } from 'react';
import { ProposalsSection, ProposeSection } from '../panels/organism/sections/index.js';

export interface ProposalExperienceContext {
  readonly organismId: string;
  readonly refreshKey: number;
  readonly canWrite: boolean;
  readonly onMutate: () => void;
  readonly currentContentTypeId?: string;
}

export interface ProposalExperience {
  readonly id: string;
  readonly priority: number;
  matches(context: ProposalExperienceContext): boolean;
  renderPropose(context: ProposalExperienceContext): ReactNode;
  renderProposals(context: ProposalExperienceContext): ReactNode;
}

const FIRST_PARTY_DEFAULT_PROPOSAL_EXPERIENCE: ProposalExperience = {
  id: 'first-party-default',
  priority: 0,
  matches: () => true,
  renderPropose: (context) => (
    <ProposeSection
      organismId={context.organismId}
      refreshKey={context.refreshKey}
      canWrite={context.canWrite}
      onMutate={context.onMutate}
    />
  ),
  renderProposals: (context) => (
    <ProposalsSection
      organismId={context.organismId}
      refreshKey={context.refreshKey}
      canWrite={context.canWrite}
      onMutate={context.onMutate}
    />
  ),
};

const proposalExperiences: ProposalExperience[] = [FIRST_PARTY_DEFAULT_PROPOSAL_EXPERIENCE];

function sortByPriorityDescending(a: ProposalExperience, b: ProposalExperience): number {
  if (b.priority !== a.priority) return b.priority - a.priority;
  return a.id.localeCompare(b.id);
}

export function registerProposalExperience(experience: ProposalExperience): void {
  const index = proposalExperiences.findIndex((candidate) => candidate.id === experience.id);
  if (index >= 0) {
    proposalExperiences[index] = experience;
  } else {
    proposalExperiences.push(experience);
  }

  proposalExperiences.sort(sortByPriorityDescending);
}

export function resolveProposalExperience(context: ProposalExperienceContext): ProposalExperience {
  for (const experience of proposalExperiences) {
    if (experience.matches(context)) return experience;
  }

  return FIRST_PARTY_DEFAULT_PROPOSAL_EXPERIENCE;
}

export function renderProposalPanel(panelId: 'propose' | 'proposals', context: ProposalExperienceContext): ReactNode {
  const experience = resolveProposalExperience(context);
  return panelId === 'propose' ? experience.renderPropose(context) : experience.renderProposals(context);
}

export function listProposalExperiences(): ReadonlyArray<ProposalExperience> {
  return proposalExperiences;
}

export function resetProposalExperiencesForTest(): void {
  proposalExperiences.length = 0;
  proposalExperiences.push(FIRST_PARTY_DEFAULT_PROPOSAL_EXPERIENCE);
}
