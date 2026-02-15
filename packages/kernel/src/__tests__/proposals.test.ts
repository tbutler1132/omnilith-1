import { beforeEach, describe, expect, it } from 'vitest';
import { composeOrganism } from '../composition/compose-organism.js';
import type {
  ContentTypeContract,
  EvaluationResult,
  ProposalForEvaluation,
  ValidationResult,
} from '../content-types/content-type-contract.js';
import { AccessDeniedError, ProposalAlreadyResolvedError } from '../errors.js';
import type { ContentTypeId } from '../identity.js';
import { createOrganism } from '../organism/create-organism.js';
import { declineProposal } from '../proposals/decline-proposal.js';
import { evaluateProposal } from '../proposals/evaluate-proposal.js';
import { integrateProposal } from '../proposals/integrate-proposal.js';
import { openProposal } from '../proposals/open-proposal.js';
import { InMemoryCompositionRepository } from '../testing/in-memory-composition-repository.js';
import { InMemoryContentTypeRegistry } from '../testing/in-memory-content-type-registry.js';
import { InMemoryEventPublisher } from '../testing/in-memory-event-publisher.js';
import { InMemoryOrganismRepository } from '../testing/in-memory-organism-repository.js';
import { InMemoryProposalRepository } from '../testing/in-memory-proposal-repository.js';
import { InMemoryRelationshipRepository } from '../testing/in-memory-relationship-repository.js';
import { InMemoryStateRepository } from '../testing/in-memory-state-repository.js';
import { InMemoryVisibilityRepository } from '../testing/in-memory-visibility-repository.js';
import {
  createPassthroughContentType,
  createTestIdentityGenerator,
  resetIdCounter,
  testContentTypeId,
  testUserId,
} from '../testing/test-helpers.js';

describe('proposals', () => {
  let organismRepository: InMemoryOrganismRepository;
  let stateRepository: InMemoryStateRepository;
  let eventPublisher: InMemoryEventPublisher;
  let relationshipRepository: InMemoryRelationshipRepository;
  let contentTypeRegistry: InMemoryContentTypeRegistry;
  let compositionRepository: InMemoryCompositionRepository;
  let proposalRepository: InMemoryProposalRepository;
  let visibilityRepository: InMemoryVisibilityRepository;
  let identityGenerator: ReturnType<typeof createTestIdentityGenerator>;

  beforeEach(() => {
    resetIdCounter();
    organismRepository = new InMemoryOrganismRepository();
    stateRepository = new InMemoryStateRepository();
    eventPublisher = new InMemoryEventPublisher();
    relationshipRepository = new InMemoryRelationshipRepository();
    contentTypeRegistry = new InMemoryContentTypeRegistry();
    compositionRepository = new InMemoryCompositionRepository();
    proposalRepository = new InMemoryProposalRepository();
    visibilityRepository = new InMemoryVisibilityRepository();
    identityGenerator = createTestIdentityGenerator();
    contentTypeRegistry.register(createPassthroughContentType());
  });

  const createDeps = () => ({
    organismRepository,
    stateRepository,
    eventPublisher,
    relationshipRepository,
    contentTypeRegistry,
    identityGenerator,
  });

  const openDeps = () => ({
    organismRepository,
    proposalRepository,
    contentTypeRegistry,
    eventPublisher,
    identityGenerator,
  });

  const integrateDeps = () => ({
    proposalRepository,
    organismRepository,
    stateRepository,
    contentTypeRegistry,
    compositionRepository,
    eventPublisher,
    relationshipRepository,
    visibilityRepository,
    identityGenerator,
  });

  const declineDeps = () => ({
    proposalRepository,
    organismRepository,
    compositionRepository,
    eventPublisher,
    relationshipRepository,
    visibilityRepository,
    identityGenerator,
  });

  it('a proposal is created with open status', async () => {
    const userId = testUserId('proposer');
    const { organism } = await createOrganism(
      { contentTypeId: testContentTypeId(), payload: { v: 1 }, createdBy: userId },
      createDeps(),
    );

    const proposal = await openProposal(
      {
        organismId: organism.id,
        proposedContentTypeId: testContentTypeId(),
        proposedPayload: { v: 2 },
        proposedBy: userId,
      },
      openDeps(),
    );

    expect(proposal.status).toBe('open');
    expect(proposal.proposedPayload).toEqual({ v: 2 });
  });

  it('opening a proposal emits a proposal.opened event', async () => {
    const userId = testUserId('proposer');
    const { organism } = await createOrganism(
      { contentTypeId: testContentTypeId(), payload: { v: 1 }, createdBy: userId },
      createDeps(),
    );

    eventPublisher.clear();

    await openProposal(
      {
        organismId: organism.id,
        proposedContentTypeId: testContentTypeId(),
        proposedPayload: { v: 2 },
        proposedBy: userId,
      },
      openDeps(),
    );

    const events = eventPublisher.findByType('proposal.opened');
    expect(events).toHaveLength(1);
  });

  it('integrating a proposal advances the organism state', async () => {
    const steward = testUserId('steward');
    const { organism } = await createOrganism(
      { contentTypeId: testContentTypeId(), payload: { v: 1 }, createdBy: steward },
      createDeps(),
    );

    const proposal = await openProposal(
      {
        organismId: organism.id,
        proposedContentTypeId: testContentTypeId(),
        proposedPayload: { v: 2 },
        proposedBy: testUserId('contributor'),
      },
      openDeps(),
    );

    const result = await integrateProposal({ proposalId: proposal.id, integratedBy: steward }, integrateDeps());

    expect(result.outcome).toBe('integrated');
    expect(result.proposal.status).toBe('integrated');
    if (result.outcome === 'integrated') {
      expect(result.newState.payload).toEqual({ v: 2 });
      expect(result.newState.sequenceNumber).toBe(2);
    }
  });

  it('declining a proposal leaves the organism state unchanged', async () => {
    const steward = testUserId('steward');
    const { organism, initialState } = await createOrganism(
      { contentTypeId: testContentTypeId(), payload: { v: 1 }, createdBy: steward },
      createDeps(),
    );

    const proposal = await openProposal(
      {
        organismId: organism.id,
        proposedContentTypeId: testContentTypeId(),
        proposedPayload: { v: 2 },
        proposedBy: testUserId('contributor'),
      },
      openDeps(),
    );

    const declined = await declineProposal(
      { proposalId: proposal.id, declinedBy: steward, reason: 'Not yet' },
      declineDeps(),
    );

    expect(declined.status).toBe('declined');
    expect(declined.declineReason).toBe('Not yet');

    const currentState = await stateRepository.findCurrentByOrganismId(organism.id);
    expect(currentState!.id).toBe(initialState.id);
  });

  it('a user without integration authority cannot integrate a proposal', async () => {
    const steward = testUserId('steward');
    const outsider = testUserId('outsider');
    const { organism } = await createOrganism(
      { contentTypeId: testContentTypeId(), payload: { v: 1 }, createdBy: steward },
      createDeps(),
    );

    const proposal = await openProposal(
      {
        organismId: organism.id,
        proposedContentTypeId: testContentTypeId(),
        proposedPayload: { v: 2 },
        proposedBy: testUserId('contributor'),
      },
      openDeps(),
    );

    await expect(
      integrateProposal({ proposalId: proposal.id, integratedBy: outsider }, integrateDeps()),
    ).rejects.toThrow(AccessDeniedError);
  });

  it('an already resolved proposal cannot be integrated again', async () => {
    const steward = testUserId('steward');
    const { organism } = await createOrganism(
      { contentTypeId: testContentTypeId(), payload: { v: 1 }, createdBy: steward },
      createDeps(),
    );

    const proposal = await openProposal(
      {
        organismId: organism.id,
        proposedContentTypeId: testContentTypeId(),
        proposedPayload: { v: 2 },
        proposedBy: testUserId('contributor'),
      },
      openDeps(),
    );

    await integrateProposal({ proposalId: proposal.id, integratedBy: steward }, integrateDeps());

    await expect(
      integrateProposal({ proposalId: proposal.id, integratedBy: steward }, integrateDeps()),
    ).rejects.toThrow(ProposalAlreadyResolvedError);
  });

  it('a proposal to a regulated organism consults its policy organisms', async () => {
    const steward = testUserId('steward');
    const integrator = testUserId('integrator');

    // Create a policy content type that checks integratorId
    const policyTypeId = 'integration-policy' as ContentTypeId;
    const policyContract: ContentTypeContract = {
      typeId: policyTypeId,
      validate: (payload: unknown): ValidationResult => {
        const p = payload as { mode: string; integratorId: string };
        if (p.mode === 'single-integrator' && p.integratorId) {
          return { valid: true, issues: [] };
        }
        return { valid: false, issues: ['Invalid policy'] };
      },
      evaluate: (_proposal: ProposalForEvaluation, _policyPayload: unknown): EvaluationResult => {
        // This evaluator doesn't check the proposer — it just passes
        // The integration authority check is in the integrate use case
        return { decision: 'pass' };
      },
    };
    contentTypeRegistry.register(policyContract);

    // Create an album organism
    const { organism: album } = await createOrganism(
      { contentTypeId: testContentTypeId(), payload: { title: 'Album' }, createdBy: steward },
      createDeps(),
    );

    // Create a policy organism and compose it inside the album
    const { organism: policy } = await createOrganism(
      {
        contentTypeId: policyTypeId,
        payload: { mode: 'single-integrator', integratorId: integrator },
        createdBy: steward,
      },
      createDeps(),
    );

    await composeOrganism(
      { parentId: album.id, childId: policy.id, composedBy: steward },
      { organismRepository, compositionRepository, eventPublisher, identityGenerator },
    );

    // Open a proposal to the album
    const proposal = await openProposal(
      {
        organismId: album.id,
        proposedContentTypeId: testContentTypeId(),
        proposedPayload: { title: 'Updated Album' },
        proposedBy: testUserId('contributor'),
      },
      openDeps(),
    );

    // Evaluate it — the policy should be consulted
    const evaluation = await evaluateProposal(proposal, {
      compositionRepository,
      stateRepository,
      contentTypeRegistry,
    });

    expect(evaluation.results).toHaveLength(1);
    expect(evaluation.passed).toBe(true);
  });

  it("a policy organism inside a parent does not affect proposals to that parent's children", async () => {
    const steward = testUserId('steward');

    // Create a policy that always declines
    const strictPolicyTypeId = 'strict-policy' as ContentTypeId;
    const strictPolicyContract: ContentTypeContract = {
      typeId: strictPolicyTypeId,
      validate: (): ValidationResult => ({ valid: true, issues: [] }),
      evaluate: (): EvaluationResult => ({ decision: 'decline', reason: 'Always decline' }),
    };
    contentTypeRegistry.register(strictPolicyContract);

    // Create album → song hierarchy with policy on album
    const { organism: album } = await createOrganism(
      { contentTypeId: testContentTypeId(), payload: { title: 'Album' }, createdBy: steward },
      createDeps(),
    );

    const { organism: song } = await createOrganism(
      { contentTypeId: testContentTypeId(), payload: { title: 'Song' }, createdBy: steward },
      createDeps(),
    );

    const { organism: policy } = await createOrganism(
      { contentTypeId: strictPolicyTypeId, payload: {}, createdBy: steward },
      createDeps(),
    );

    // Compose: album contains song AND policy
    await composeOrganism(
      { parentId: album.id, childId: song.id, composedBy: steward },
      { organismRepository, compositionRepository, eventPublisher, identityGenerator },
    );
    await composeOrganism(
      { parentId: album.id, childId: policy.id, composedBy: steward },
      { organismRepository, compositionRepository, eventPublisher, identityGenerator },
    );

    // Proposal to the SONG should NOT be affected by album's policy
    const songProposal = await openProposal(
      {
        organismId: song.id,
        proposedContentTypeId: testContentTypeId(),
        proposedPayload: { title: 'Updated Song' },
        proposedBy: testUserId('contributor'),
      },
      openDeps(),
    );

    const evaluation = await evaluateProposal(songProposal, {
      compositionRepository,
      stateRepository,
      contentTypeRegistry,
    });

    // Song has no policy children — evaluation should pass
    expect(evaluation.passed).toBe(true);
    expect(evaluation.results).toHaveLength(0);
  });

  it('a policy organism that declines causes the proposal to fail', async () => {
    const steward = testUserId('steward');

    const rejectPolicyTypeId = 'reject-policy' as ContentTypeId;
    const rejectPolicyContract: ContentTypeContract = {
      typeId: rejectPolicyTypeId,
      validate: (): ValidationResult => ({ valid: true, issues: [] }),
      evaluate: (): EvaluationResult => ({
        decision: 'decline',
        reason: 'Not acceptable',
      }),
    };
    contentTypeRegistry.register(rejectPolicyContract);

    const { organism: parent } = await createOrganism(
      { contentTypeId: testContentTypeId(), payload: { v: 1 }, createdBy: steward },
      createDeps(),
    );

    const { organism: policy } = await createOrganism(
      { contentTypeId: rejectPolicyTypeId, payload: {}, createdBy: steward },
      createDeps(),
    );

    await composeOrganism(
      { parentId: parent.id, childId: policy.id, composedBy: steward },
      { organismRepository, compositionRepository, eventPublisher, identityGenerator },
    );

    const proposal = await openProposal(
      {
        organismId: parent.id,
        proposedContentTypeId: testContentTypeId(),
        proposedPayload: { v: 2 },
        proposedBy: testUserId('contributor'),
      },
      openDeps(),
    );

    const evaluation = await evaluateProposal(proposal, {
      compositionRepository,
      stateRepository,
      contentTypeRegistry,
    });

    expect(evaluation.passed).toBe(false);
    expect(evaluation.results[0].result.reason).toBe('Not acceptable');
  });
});
