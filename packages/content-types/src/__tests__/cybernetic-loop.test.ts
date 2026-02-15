/**
 * Cybernetic feedback loop — end-to-end test.
 *
 * This test demonstrates the emergent cybernetic layer: organisms
 * that observe, compute, and govern, composed together inside a
 * community. No kernel changes were required. The entire feedback
 * loop is built from content types and composition.
 *
 * The story:
 *   A community organism contains a sensor (watching activity),
 *   a variable (computing health), and a response policy (governing
 *   proposals based on health). When health is good, proposals flow.
 *   When health drops, the community protects itself by declining
 *   proposals. When health recovers, proposals flow again.
 */

import type { ContentTypeId, Timestamp, UserId } from '@omnilith/kernel';
import { appendState, composeOrganism, createOrganism, evaluateProposal, openProposal } from '@omnilith/kernel';
import {
  createTestIdentityGenerator,
  InMemoryCompositionRepository,
  InMemoryContentTypeRegistry,
  InMemoryEventPublisher,
  InMemoryOrganismRepository,
  InMemoryProposalRepository,
  InMemoryRelationshipRepository,
  InMemoryStateRepository,
  InMemoryVisibilityRepository,
  resetIdCounter,
} from '@omnilith/kernel/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { responsePolicyContentType } from '../response-policy/index.js';
import { sensorContentType } from '../sensor/index.js';
import { variableContentType } from '../variable/index.js';

// A passthrough content type for the community organism itself
const communityContentType = {
  typeId: 'community' as ContentTypeId,
  validate: () => ({ valid: true, issues: [] }),
};

// A passthrough content type for proposals to the community
const textContentType = {
  typeId: 'text' as ContentTypeId,
  validate: () => ({ valid: true, issues: [] }),
};

describe('cybernetic feedback loop', () => {
  let organismRepository: InMemoryOrganismRepository;
  let stateRepository: InMemoryStateRepository;
  let compositionRepository: InMemoryCompositionRepository;
  let proposalRepository: InMemoryProposalRepository;
  let eventPublisher: InMemoryEventPublisher;
  let relationshipRepository: InMemoryRelationshipRepository;
  let visibilityRepository: InMemoryVisibilityRepository;
  let contentTypeRegistry: InMemoryContentTypeRegistry;
  let identityGenerator: ReturnType<typeof createTestIdentityGenerator>;

  const founder = 'usr-founder' as UserId;
  const contributor = 'usr-contributor' as UserId;

  beforeEach(() => {
    resetIdCounter();
    organismRepository = new InMemoryOrganismRepository();
    stateRepository = new InMemoryStateRepository();
    compositionRepository = new InMemoryCompositionRepository();
    proposalRepository = new InMemoryProposalRepository();
    eventPublisher = new InMemoryEventPublisher();
    relationshipRepository = new InMemoryRelationshipRepository();
    visibilityRepository = new InMemoryVisibilityRepository();
    contentTypeRegistry = new InMemoryContentTypeRegistry();
    identityGenerator = createTestIdentityGenerator();

    // Register all content types needed for the loop
    contentTypeRegistry.register(communityContentType);
    contentTypeRegistry.register(textContentType);
    contentTypeRegistry.register(sensorContentType);
    contentTypeRegistry.register(variableContentType);
    contentTypeRegistry.register(responsePolicyContentType);
  });

  const createDeps = () => ({
    organismRepository,
    stateRepository,
    contentTypeRegistry,
    eventPublisher,
    relationshipRepository,
    identityGenerator,
  });

  const composeDeps = () => ({
    organismRepository,
    compositionRepository,
    eventPublisher,
    identityGenerator,
  });

  const proposalDeps = () => ({
    organismRepository,
    proposalRepository,
    contentTypeRegistry,
    eventPublisher,
    identityGenerator,
  });

  const evaluateDeps = () => ({
    compositionRepository,
    stateRepository,
    contentTypeRegistry,
  });

  /**
   * Wire up a community with a full cybernetic loop:
   * community <- sensor + variable + response-policy
   */
  async function wireCyberneticCommunity(healthValue: number) {
    // 1. Create the community organism
    const { organism: community } = await createOrganism(
      {
        contentTypeId: 'community' as ContentTypeId,
        payload: { name: 'Creative Studio' },
        createdBy: founder,
      },
      createDeps(),
    );

    // 2. Create the sensor — watching the community for state changes
    const { organism: sensor } = await createOrganism(
      {
        contentTypeId: 'sensor' as ContentTypeId,
        payload: {
          label: 'activity-sensor',
          targetOrganismId: community.id,
          metric: 'state-changes',
          readings: [{ value: 12, sampledAt: Date.now() as Timestamp }],
        },
        createdBy: founder,
      },
      createDeps(),
    );

    // 3. Create the variable — community health derived from sensor
    const { organism: variable } = await createOrganism(
      {
        contentTypeId: 'variable' as ContentTypeId,
        payload: {
          label: 'community-health',
          value: healthValue,
          thresholds: { low: 0.4, critical: 0.2 },
          computedFrom: 'activity-sensor readings over 7-day window',
          computedAt: Date.now() as Timestamp,
        },
        createdBy: founder,
      },
      createDeps(),
    );

    // 4. Create the response policy — decline proposals when health is low
    const { organism: responsePolicy } = await createOrganism(
      {
        contentTypeId: 'response-policy' as ContentTypeId,
        payload: {
          mode: 'variable-threshold',
          variableLabel: 'community-health',
          condition: 'below',
          threshold: 0.3,
          currentVariableValue: healthValue,
          action: 'decline-all',
          reason: 'Community health is critically low. New proposals are paused until activity recovers.',
        },
        createdBy: founder,
        openTrunk: true, // loop runner needs to update the variable snapshot
      },
      createDeps(),
    );

    // 5. Compose all three inside the community
    for (const child of [sensor, variable, responsePolicy]) {
      await composeOrganism({ parentId: community.id, childId: child.id, composedBy: founder }, composeDeps());
    }

    return { community, sensor, variable, responsePolicy };
  }

  it('a community with healthy activity passes proposals through', async () => {
    const { community } = await wireCyberneticCommunity(0.8);

    // A contributor proposes new content to the community
    const proposal = await openProposal(
      {
        organismId: community.id,
        proposedContentTypeId: 'text' as ContentTypeId,
        proposedPayload: { content: 'A new creative piece' },
        proposedBy: contributor,
      },
      proposalDeps(),
    );

    // The kernel evaluates: finds the response-policy child, calls its evaluator
    // Health is 0.8, threshold is 0.3 — condition (below 0.3) is NOT triggered
    const outcome = await evaluateProposal(proposal, evaluateDeps());

    expect(outcome.passed).toBe(true);
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0].result.decision).toBe('pass');
  });

  it('declining health causes the response policy to protect the community', async () => {
    const { community, responsePolicy } = await wireCyberneticCommunity(0.8);

    // Time passes. The loop runner detects declining activity.
    // It updates the response-policy's state with the latest variable snapshot.
    await appendState(
      {
        organismId: responsePolicy.id,
        contentTypeId: 'response-policy' as ContentTypeId,
        payload: {
          mode: 'variable-threshold',
          variableLabel: 'community-health',
          condition: 'below',
          threshold: 0.3,
          currentVariableValue: 0.15, // health has dropped critically
          action: 'decline-all',
          reason: 'Community health is critically low. New proposals are paused until activity recovers.',
        },
        appendedBy: founder,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        identityGenerator,
        visibilityRepository,
        relationshipRepository,
        compositionRepository,
      },
    );

    // A contributor proposes new content
    const proposal = await openProposal(
      {
        organismId: community.id,
        proposedContentTypeId: 'text' as ContentTypeId,
        proposedPayload: { content: 'Another creative piece' },
        proposedBy: contributor,
      },
      proposalDeps(),
    );

    // The kernel evaluates: health is 0.15, below threshold of 0.3 → DECLINED
    const outcome = await evaluateProposal(proposal, evaluateDeps());

    expect(outcome.passed).toBe(false);
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0].result.decision).toBe('decline');
    expect(outcome.results[0].result.reason).toContain('critically low');
  });

  it('recovery restores normal proposal flow', async () => {
    const { community, responsePolicy } = await wireCyberneticCommunity(0.15);

    // First, verify that proposals are being declined
    const blockedProposal = await openProposal(
      {
        organismId: community.id,
        proposedContentTypeId: 'text' as ContentTypeId,
        proposedPayload: { content: 'Blocked piece' },
        proposedBy: contributor,
      },
      proposalDeps(),
    );
    const blockedOutcome = await evaluateProposal(blockedProposal, evaluateDeps());
    expect(blockedOutcome.passed).toBe(false);

    // The community recovers. The loop runner detects increased activity
    // and updates the response-policy with the recovered health value.
    await appendState(
      {
        organismId: responsePolicy.id,
        contentTypeId: 'response-policy' as ContentTypeId,
        payload: {
          mode: 'variable-threshold',
          variableLabel: 'community-health',
          condition: 'below',
          threshold: 0.3,
          currentVariableValue: 0.6, // health has recovered
          action: 'decline-all',
          reason: 'Community health is critically low. New proposals are paused until activity recovers.',
        },
        appendedBy: founder,
      },
      {
        organismRepository,
        stateRepository,
        contentTypeRegistry,
        eventPublisher,
        identityGenerator,
        visibilityRepository,
        relationshipRepository,
        compositionRepository,
      },
    );

    // A new proposal arrives — this time it should pass
    const recoveredProposal = await openProposal(
      {
        organismId: community.id,
        proposedContentTypeId: 'text' as ContentTypeId,
        proposedPayload: { content: 'Welcome back piece' },
        proposedBy: contributor,
      },
      proposalDeps(),
    );

    const recoveredOutcome = await evaluateProposal(recoveredProposal, evaluateDeps());
    expect(recoveredOutcome.passed).toBe(true);
  });

  it('a response policy with no variable snapshot yet passes by default', async () => {
    // Create a community with a response policy that has no currentVariableValue
    const { organism: community } = await createOrganism(
      {
        contentTypeId: 'community' as ContentTypeId,
        payload: { name: 'New Community' },
        createdBy: founder,
      },
      createDeps(),
    );

    const { organism: responsePolicy } = await createOrganism(
      {
        contentTypeId: 'response-policy' as ContentTypeId,
        payload: {
          mode: 'variable-threshold',
          variableLabel: 'community-health',
          condition: 'below',
          threshold: 0.3,
          // No currentVariableValue — the loop runner hasn't populated it yet
          action: 'decline-all',
          reason: 'Health too low.',
        },
        createdBy: founder,
      },
      createDeps(),
    );

    await composeOrganism({ parentId: community.id, childId: responsePolicy.id, composedBy: founder }, composeDeps());

    const proposal = await openProposal(
      {
        organismId: community.id,
        proposedContentTypeId: 'text' as ContentTypeId,
        proposedPayload: { content: 'First contribution' },
        proposedBy: contributor,
      },
      proposalDeps(),
    );

    // No variable data yet → default to pass (don't block before loop starts)
    const outcome = await evaluateProposal(proposal, evaluateDeps());
    expect(outcome.passed).toBe(true);
  });
});
