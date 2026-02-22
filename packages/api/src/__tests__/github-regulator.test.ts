import { allContentTypes } from '@omnilith/content-types';
import type { ContentTypeId, ContentTypeRegistry, OrganismId, UserId } from '@omnilith/kernel';
import { composeOrganism, createOrganism, recordObservation } from '@omnilith/kernel';
import {
  createTestIdentityGenerator,
  InMemoryCompositionRepository,
  InMemoryContentTypeRegistry,
  InMemoryEventPublisher,
  InMemoryOrganismRepository,
  InMemoryProposalRepository,
  InMemoryQueryPort,
  InMemoryRelationshipRepository,
  InMemoryStateRepository,
  InMemoryVisibilityRepository,
  resetIdCounter,
} from '@omnilith/kernel/src/testing/index.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Container } from '../container.js';
import type { GitHubPullRequestGateway } from '../github/github-pull-request-gateway.js';
import { createNoopGitHubPlugin } from '../github/plugin.js';
import { NoopProposalIntegrationTrigger } from '../github/proposal-integration-trigger.js';
import { runRegulatorCycle } from '../regulator/regulator-runtime.js';
import { runConfiguredRegulatorCycle } from '../regulator/run-configured-regulator-cycle.js';

function createTestContainer(): Container {
  const registry = new InMemoryContentTypeRegistry();
  for (const ct of allContentTypes) {
    registry.register(ct);
  }

  const organismRepository = new InMemoryOrganismRepository();
  const stateRepository = new InMemoryStateRepository();
  const compositionRepository = new InMemoryCompositionRepository();
  const proposalRepository = new InMemoryProposalRepository();
  const eventPublisher = new InMemoryEventPublisher();
  const relationshipRepository = new InMemoryRelationshipRepository();

  return {
    organismRepository,
    stateRepository,
    compositionRepository,
    proposalRepository,
    eventPublisher,
    eventRepository: eventPublisher,
    visibilityRepository: new InMemoryVisibilityRepository(),
    relationshipRepository,
    contentTypeRegistry: registry as ContentTypeRegistry,
    identityGenerator: createTestIdentityGenerator(),
    queryPort: new InMemoryQueryPort(
      organismRepository,
      stateRepository,
      proposalRepository,
      compositionRepository,
      eventPublisher,
      relationshipRepository,
    ),
    proposalIntegrationTrigger: new NoopProposalIntegrationTrigger(),
    githubPlugin: createNoopGitHubPlugin(),
    db: null as unknown as Container['db'],
  };
}

async function composeChild(
  container: Container,
  parentId: OrganismId,
  childId: OrganismId,
  steward: UserId,
): Promise<void> {
  await composeOrganism(
    { parentId, childId, composedBy: steward },
    {
      organismRepository: container.organismRepository,
      compositionRepository: container.compositionRepository,
      visibilityRepository: container.visibilityRepository,
      relationshipRepository: container.relationshipRepository,
      eventPublisher: container.eventPublisher,
      identityGenerator: container.identityGenerator,
    },
  );
}

describe('regulator runtime', () => {
  let container: Container;
  const steward = 'usr-regulator' as UserId;

  beforeEach(() => {
    resetIdCounter();
    container = createTestContainer();
  });

  afterEach(() => {
    delete process.env.REGULATOR_BOUNDARY_ORGANISM_IDS;
    delete process.env.REGULATOR_RUNNER_USER_ID;
    delete process.env.GITHUB_ALLOWED_REPOS;
    delete process.env.REGULATOR_ALLOWED_BASE_BRANCHES;
    delete process.env.REGULATOR_ALLOWED_TARGET_ORGANISM_IDS;
  });

  it('updates managed variables and response policies for composed regulator organisms', async () => {
    const createDeps = {
      organismRepository: container.organismRepository,
      stateRepository: container.stateRepository,
      contentTypeRegistry: container.contentTypeRegistry,
      eventPublisher: container.eventPublisher,
      relationshipRepository: container.relationshipRepository,
      identityGenerator: container.identityGenerator,
    };

    const boundary = await createOrganism(
      {
        name: 'GitHub Loop Boundary',
        contentTypeId: 'text' as ContentTypeId,
        payload: {
          content: 'boundary',
          format: 'plaintext',
        },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps,
    );

    const sensor = await createOrganism(
      {
        name: 'GitHub Issue Sensor',
        contentTypeId: 'sensor' as ContentTypeId,
        payload: {
          label: 'github-issue-pressure',
          targetOrganismId: boundary.organism.id,
          metric: 'github-issues',
          readings: [],
        },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps,
    );

    const variable = await createOrganism(
      {
        name: 'Issue Pressure Variable',
        contentTypeId: 'variable' as ContentTypeId,
        payload: {
          label: 'issue-pressure',
          value: 0,
          unit: 'issues',
          computedFrom: 'seed',
          computedAt: container.identityGenerator.timestamp(),
          computation: {
            mode: 'observation-sum',
            sensorLabel: 'github-issue-pressure',
            metric: 'github-issues',
          },
        },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps,
    );

    const responsePolicy = await createOrganism(
      {
        name: 'Issue Pressure Policy',
        contentTypeId: 'response-policy' as ContentTypeId,
        payload: {
          mode: 'variable-threshold',
          variableLabel: 'issue-pressure',
          condition: 'above',
          threshold: 3,
          action: 'decline-all',
          reason: 'Issue pressure is high.',
        },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps,
    );

    await composeChild(container, boundary.organism.id, sensor.organism.id, steward);
    await composeChild(container, boundary.organism.id, variable.organism.id, steward);
    await composeChild(container, boundary.organism.id, responsePolicy.organism.id, steward);

    const observeDeps = {
      organismRepository: container.organismRepository,
      eventPublisher: container.eventPublisher,
      identityGenerator: container.identityGenerator,
      visibilityRepository: container.visibilityRepository,
      relationshipRepository: container.relationshipRepository,
      compositionRepository: container.compositionRepository,
    };

    await recordObservation(
      {
        organismId: sensor.organism.id,
        targetOrganismId: boundary.organism.id,
        metric: 'github-issues',
        value: 1,
        sampledAt: container.identityGenerator.timestamp(),
        observedBy: steward,
      },
      observeDeps,
    );
    await recordObservation(
      {
        organismId: sensor.organism.id,
        targetOrganismId: boundary.organism.id,
        metric: 'github-issues',
        value: 1,
        sampledAt: container.identityGenerator.timestamp(),
        observedBy: steward,
      },
      observeDeps,
    );
    await recordObservation(
      {
        organismId: sensor.organism.id,
        targetOrganismId: boundary.organism.id,
        metric: 'github-issues',
        value: -1,
        sampledAt: container.identityGenerator.timestamp(),
        observedBy: steward,
      },
      observeDeps,
    );

    process.env.REGULATOR_BOUNDARY_ORGANISM_IDS = boundary.organism.id;
    process.env.REGULATOR_RUNNER_USER_ID = steward;

    const result = await runConfiguredRegulatorCycle(container);
    expect(result.boundariesProcessed).toBe(1);
    expect(result.variableUpdates).toBe(1);
    expect(result.responsePolicyUpdates).toBe(1);
    expect(result.skippedManagedVariables).toBe(0);
    expect(result.directActionExecutions).toBe(0);
    expect(result.proposalActionsOpened).toBe(0);
    expect(result.boundaries).toEqual([
      {
        boundaryOrganismId: boundary.organism.id,
        variableUpdates: 1,
        responsePolicyUpdates: 1,
        skippedManagedVariables: 0,
        directActionExecutions: 0,
        proposalActionsOpened: 0,
        declinedActions: 0,
        failedActions: 0,
      },
    ]);

    const variableState = await container.stateRepository.findCurrentByOrganismId(variable.organism.id);
    const variablePayload = variableState?.payload as { value: number; computedFrom: string };
    expect(variablePayload.value).toBe(1);
    expect(variablePayload.computedFrom).toBe('observation-sum:github-issue-pressure:github-issues');

    const policyState = await container.stateRepository.findCurrentByOrganismId(responsePolicy.organism.id);
    const policyPayload = policyState?.payload as { currentVariableValue: number };
    expect(policyPayload.currentVariableValue).toBe(1);
  });

  it('opens proposals for high-risk action organisms', async () => {
    const createDeps = {
      organismRepository: container.organismRepository,
      stateRepository: container.stateRepository,
      contentTypeRegistry: container.contentTypeRegistry,
      eventPublisher: container.eventPublisher,
      relationshipRepository: container.relationshipRepository,
      identityGenerator: container.identityGenerator,
    };

    const boundary = await createOrganism(
      {
        name: 'Regulated Boundary',
        contentTypeId: 'text' as ContentTypeId,
        payload: {
          content: 'boundary',
          format: 'plaintext',
        },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps,
    );

    const sensor = await createOrganism(
      {
        name: 'Issue Sensor',
        contentTypeId: 'sensor' as ContentTypeId,
        payload: {
          label: 'issue-sensor',
          targetOrganismId: boundary.organism.id,
          metric: 'github-issues',
          readings: [],
        },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps,
    );

    const variable = await createOrganism(
      {
        name: 'Issue Variable',
        contentTypeId: 'variable' as ContentTypeId,
        payload: {
          label: 'issue-pressure',
          value: 0,
          computedAt: container.identityGenerator.timestamp(),
          computation: {
            mode: 'observation-sum',
            sensorLabel: 'issue-sensor',
            metric: 'github-issues',
          },
        },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps,
    );

    const responsePolicy = await createOrganism(
      {
        name: 'Pass Policy',
        contentTypeId: 'response-policy' as ContentTypeId,
        payload: {
          mode: 'variable-threshold',
          variableLabel: 'issue-pressure',
          condition: 'above',
          threshold: 0,
          action: 'pass',
          reason: 'in range',
        },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps,
    );

    const action = await createOrganism(
      {
        name: 'High Risk Action',
        contentTypeId: 'action' as ContentTypeId,
        payload: {
          label: 'Open PR Proposal',
          kind: 'github-pr',
          executionMode: 'direct-low-risk',
          riskLevel: 'high',
          trigger: {
            responsePolicyOrganismId: responsePolicy.organism.id,
            whenDecision: 'pass',
          },
          config: {
            owner: 'omnilith-labs',
            repository: 'omnilith',
            baseBranch: 'main',
            headBranch: 'automation/regulator-test',
            title: 'Automated PR',
            body: 'Generated action proposal',
          },
        },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps,
    );

    await composeChild(container, boundary.organism.id, sensor.organism.id, steward);
    await composeChild(container, boundary.organism.id, variable.organism.id, steward);
    await composeChild(container, boundary.organism.id, responsePolicy.organism.id, steward);
    await composeChild(container, boundary.organism.id, action.organism.id, steward);

    await recordObservation(
      {
        organismId: sensor.organism.id,
        targetOrganismId: boundary.organism.id,
        metric: 'github-issues',
        value: 1,
        sampledAt: container.identityGenerator.timestamp(),
        observedBy: steward,
      },
      {
        organismRepository: container.organismRepository,
        eventPublisher: container.eventPublisher,
        identityGenerator: container.identityGenerator,
        visibilityRepository: container.visibilityRepository,
        relationshipRepository: container.relationshipRepository,
        compositionRepository: container.compositionRepository,
      },
    );

    const result = await runRegulatorCycle(container, {
      boundaryOrganismIds: [boundary.organism.id],
      runnerUserId: steward,
    });

    expect(result.proposalActionsOpened).toBe(1);
    expect(result.directActionExecutions).toBe(0);
    expect(result.failedActions).toBe(0);

    const proposals = await container.proposalRepository.findByOrganismId(boundary.organism.id);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].description).toContain('Regulator action proposal');
  });

  it('fans out high-risk open-proposal actions by variable count when configured', async () => {
    const createDeps = {
      organismRepository: container.organismRepository,
      stateRepository: container.stateRepository,
      contentTypeRegistry: container.contentTypeRegistry,
      eventPublisher: container.eventPublisher,
      relationshipRepository: container.relationshipRepository,
      identityGenerator: container.identityGenerator,
    };

    const boundary = await createOrganism(
      {
        name: 'Fan-out Boundary',
        contentTypeId: 'text' as ContentTypeId,
        payload: { content: 'boundary', format: 'plaintext' },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps,
    );

    const sensor = await createOrganism(
      {
        name: 'Fan-out Sensor',
        contentTypeId: 'sensor' as ContentTypeId,
        payload: {
          label: 'fan-out-sensor',
          targetOrganismId: boundary.organism.id,
          metric: 'github-issues',
          readings: [],
        },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps,
    );

    const variable = await createOrganism(
      {
        name: 'Fan-out Variable',
        contentTypeId: 'variable' as ContentTypeId,
        payload: {
          label: 'fan-out-variable',
          value: 0,
          computedAt: container.identityGenerator.timestamp(),
          computation: {
            mode: 'observation-sum',
            sensorLabel: 'fan-out-sensor',
            metric: 'github-issues',
          },
        },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps,
    );

    const responsePolicy = await createOrganism(
      {
        name: 'Fan-out Policy',
        contentTypeId: 'response-policy' as ContentTypeId,
        payload: {
          mode: 'variable-threshold',
          variableLabel: 'fan-out-variable',
          condition: 'above',
          threshold: 0,
          action: 'decline-all',
          reason: 'fan-out trigger',
        },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps,
    );

    const action = await createOrganism(
      {
        name: 'Fan-out Action',
        contentTypeId: 'action' as ContentTypeId,
        payload: {
          label: 'Fan-out open proposal',
          kind: 'open-proposal',
          executionMode: 'proposal-required',
          riskLevel: 'high',
          trigger: {
            responsePolicyOrganismId: responsePolicy.organism.id,
            whenDecision: 'decline',
          },
          config: {
            targetOrganismId: boundary.organism.id,
            proposedContentTypeId: 'text',
            proposedPayload: { content: 'fan-out payload', format: 'markdown' },
            description: 'Fan-out proposal',
            fanOutByVariableCount: true,
          },
        },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps,
    );

    await composeChild(container, boundary.organism.id, sensor.organism.id, steward);
    await composeChild(container, boundary.organism.id, variable.organism.id, steward);
    await composeChild(container, boundary.organism.id, responsePolicy.organism.id, steward);
    await composeChild(container, boundary.organism.id, action.organism.id, steward);

    await recordObservation(
      {
        organismId: sensor.organism.id,
        targetOrganismId: boundary.organism.id,
        metric: 'github-issues',
        value: 2,
        sampledAt: container.identityGenerator.timestamp(),
        observedBy: steward,
      },
      {
        organismRepository: container.organismRepository,
        eventPublisher: container.eventPublisher,
        identityGenerator: container.identityGenerator,
        visibilityRepository: container.visibilityRepository,
        relationshipRepository: container.relationshipRepository,
        compositionRepository: container.compositionRepository,
      },
    );

    const result = await runRegulatorCycle(container, {
      boundaryOrganismIds: [boundary.organism.id],
      runnerUserId: steward,
    });

    expect(result.proposalActionsOpened).toBe(2);
    expect(result.failedActions).toBe(0);

    const proposals = await container.proposalRepository.findByOrganismId(boundary.organism.id);
    expect(proposals).toHaveLength(2);
  });

  it('executes low-risk github-pr action organisms directly with gateway adapter', async () => {
    const createDeps = {
      organismRepository: container.organismRepository,
      stateRepository: container.stateRepository,
      contentTypeRegistry: container.contentTypeRegistry,
      eventPublisher: container.eventPublisher,
      relationshipRepository: container.relationshipRepository,
      identityGenerator: container.identityGenerator,
    };

    const boundary = await createOrganism(
      {
        name: 'Direct Action Boundary',
        contentTypeId: 'text' as ContentTypeId,
        payload: { content: 'boundary', format: 'plaintext' },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps,
    );

    const policy = await createOrganism(
      {
        name: 'Direct Policy',
        contentTypeId: 'response-policy' as ContentTypeId,
        payload: {
          mode: 'variable-threshold',
          variableLabel: 'issue-pressure',
          condition: 'above',
          threshold: 0,
          currentVariableValue: 2,
          action: 'pass',
          reason: 'go',
        },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps,
    );

    const action = await createOrganism(
      {
        name: 'Direct Action',
        contentTypeId: 'action' as ContentTypeId,
        payload: {
          label: 'Open PR',
          kind: 'github-pr',
          executionMode: 'direct-low-risk',
          riskLevel: 'low',
          trigger: {
            responsePolicyOrganismId: policy.organism.id,
            whenDecision: 'pass',
          },
          config: {
            owner: 'omnilith-labs',
            repository: 'omnilith',
            baseBranch: 'main',
            headBranch: 'automation/direct-action-test',
            title: 'Direct action PR',
            body: 'Created from regulator action runtime',
          },
        },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps,
    );

    await composeChild(container, boundary.organism.id, policy.organism.id, steward);
    await composeChild(container, boundary.organism.id, action.organism.id, steward);

    process.env.GITHUB_ALLOWED_REPOS = 'omnilith-labs/omnilith';
    process.env.REGULATOR_ALLOWED_BASE_BRANCHES = 'main';

    const fakeGateway: GitHubPullRequestGateway = {
      async findOpenPullRequestByHead() {
        return undefined;
      },
      async createPullRequest() {
        return {
          number: 42,
          url: 'https://github.com/omnilith-labs/omnilith/pull/42',
          title: 'Direct action PR',
          state: 'open',
          headBranch: 'automation/direct-action-test',
          baseBranch: 'main',
        };
      },
    };

    const result = await runRegulatorCycle(container, {
      boundaryOrganismIds: [boundary.organism.id],
      runnerUserId: steward,
      githubPullRequestGateway: fakeGateway,
    });

    expect(result.directActionExecutions).toBe(1);
    expect(result.proposalActionsOpened).toBe(0);
    expect(result.failedActions).toBe(0);

    const actionState = await container.stateRepository.findCurrentByOrganismId(action.organism.id);
    const actionPayload = actionState?.payload as { lastExecutionKey?: string };
    expect(actionPayload.lastExecutionKey).toBeTruthy();
  });

  it('executes low-risk open-proposal actions directly for internal follow-ups', async () => {
    const createDeps = {
      organismRepository: container.organismRepository,
      stateRepository: container.stateRepository,
      contentTypeRegistry: container.contentTypeRegistry,
      eventPublisher: container.eventPublisher,
      relationshipRepository: container.relationshipRepository,
      identityGenerator: container.identityGenerator,
    };

    const boundary = await createOrganism(
      {
        name: 'Internal Action Boundary',
        contentTypeId: 'text' as ContentTypeId,
        payload: { content: 'boundary', format: 'plaintext' },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps,
    );

    const target = await createOrganism(
      {
        name: 'Target Organism',
        contentTypeId: 'text' as ContentTypeId,
        payload: { content: 'target', format: 'plaintext' },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps,
    );

    const policy = await createOrganism(
      {
        name: 'Internal Policy',
        contentTypeId: 'response-policy' as ContentTypeId,
        payload: {
          mode: 'variable-threshold',
          variableLabel: 'issue-pressure',
          condition: 'above',
          threshold: 0,
          currentVariableValue: 2,
          action: 'pass',
          reason: 'go',
        },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps,
    );

    const action = await createOrganism(
      {
        name: 'Internal Open Proposal Action',
        contentTypeId: 'action' as ContentTypeId,
        payload: {
          label: 'Open Follow-up Proposal',
          kind: 'open-proposal',
          executionMode: 'direct-low-risk',
          riskLevel: 'low',
          trigger: {
            responsePolicyOrganismId: policy.organism.id,
            whenDecision: 'pass',
          },
          config: {
            targetOrganismId: target.organism.id,
            proposedContentTypeId: 'text',
            proposedPayload: {
              content: 'Follow-up proposal from internal action adapter',
              format: 'markdown',
            },
            description: 'Internal adapter follow-up proposal',
          },
        },
        createdBy: steward,
        openTrunk: true,
      },
      createDeps,
    );

    await composeChild(container, boundary.organism.id, policy.organism.id, steward);
    await composeChild(container, boundary.organism.id, action.organism.id, steward);

    process.env.REGULATOR_ALLOWED_TARGET_ORGANISM_IDS = target.organism.id;

    const result = await runRegulatorCycle(container, {
      boundaryOrganismIds: [boundary.organism.id],
      runnerUserId: steward,
    });

    expect(result.directActionExecutions).toBe(1);
    expect(result.failedActions).toBe(0);

    const proposals = await container.proposalRepository.findByOrganismId(target.organism.id);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].description).toContain('Internal adapter follow-up proposal');
  });

  it('fails fast when no boundaries are specified and boundary discovery is unavailable', async () => {
    await expect(runConfiguredRegulatorCycle(container)).rejects.toThrow(
      'No boundary organisms specified and database boundary discovery is unavailable',
    );
  });
});
