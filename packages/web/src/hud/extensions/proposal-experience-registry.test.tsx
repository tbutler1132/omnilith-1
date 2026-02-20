import { afterEach, describe, expect, it } from 'vitest';
import {
  listProposalExperiences,
  type ProposalExperience,
  registerProposalExperience,
  resetProposalExperiencesForTest,
  resolveProposalExperience,
} from './proposal-experience-registry.js';

const CONTEXT = {
  organismId: 'org_test',
  refreshKey: 0,
  canWrite: true,
  onMutate: () => undefined,
  currentContentTypeId: 'text',
} as const;

describe('proposal experience registry', () => {
  afterEach(() => {
    resetProposalExperiencesForTest();
  });

  it('keeps a first-party default experience so host rendering works without installed add-ons', () => {
    resetProposalExperiencesForTest();

    const resolved = resolveProposalExperience(CONTEXT);

    expect(resolved.id).toBe('first-party-default');
    expect(listProposalExperiences().some((experience) => experience.id === 'first-party-default')).toBe(true);
  });

  it('prefers higher-priority matching installed experiences', () => {
    const addonExperience: ProposalExperience = {
      id: 'addon-custom',
      priority: 100,
      matches: (context) => context.currentContentTypeId === 'text',
      renderPropose: () => null,
      renderProposals: () => null,
    };
    registerProposalExperience(addonExperience);

    const resolved = resolveProposalExperience(CONTEXT);

    expect(resolved.id).toBe('addon-custom');
  });
});
