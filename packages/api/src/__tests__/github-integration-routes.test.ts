/**
 * GitHub integration routes tests — webhook ingestion behavior.
 *
 * Verifies issue webhook processing updates issue twins and records
 * observations with a sensor-authorized actor in delegated setups.
 */

import { allContentTypes } from '@omnilith/content-types';
import type { ContentTypeId, ContentTypeRegistry, OrganismId, UserId } from '@omnilith/kernel';
import { createOrganism } from '@omnilith/kernel';
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
import { githubIntegrationRoutes } from '../github/github-integration-routes.js';
import { createNoopGitHubPlugin } from '../github/plugin.js';
import { NoopProposalIntegrationTrigger } from '../github/proposal-integration-trigger.js';

interface GitHubIssueLinkRow {
  readonly issueOrganismId: string;
  readonly repositoryOrganismId: string;
  readonly actorId: string;
  readonly githubIssueUrl: string;
}

function createIssueLinkQueryDb(linkRow: GitHubIssueLinkRow): Container['db'] {
  return {
    select() {
      return {
        from(_table: unknown) {
          return {
            where(_predicate: unknown) {
              return {
                async limit(_limit: number) {
                  return [linkRow];
                },
              };
            },
          };
        },
      };
    },
  } as unknown as Container['db'];
}

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

describe('github integration routes', () => {
  let container: Container;

  beforeEach(() => {
    resetIdCounter();
    container = createTestContainer();
  });

  afterEach(() => {
    delete process.env.GITHUB_ALLOWED_REPOS;
    delete process.env.GITHUB_ISSUE_SENSOR_ORGANISM_ID;
    delete process.env.GITHUB_WEBHOOK_SECRET;
    delete process.env.REGULATOR_RUNNER_USER_ID;
  });

  it('records github-issues observations with a sensor-authorized actor when link actor lacks sensor authority', async () => {
    const sensorSteward = 'usr-sensor-steward' as UserId;
    const linkActor = 'usr-link-actor' as UserId;

    const createDeps = {
      organismRepository: container.organismRepository,
      stateRepository: container.stateRepository,
      contentTypeRegistry: container.contentTypeRegistry,
      eventPublisher: container.eventPublisher,
      relationshipRepository: container.relationshipRepository,
      identityGenerator: container.identityGenerator,
    };

    const sourceOrganism = await createOrganism(
      {
        name: 'Source Organism',
        contentTypeId: 'text' as ContentTypeId,
        payload: { content: 'source', format: 'plaintext' },
        createdBy: linkActor,
        openTrunk: true,
      },
      createDeps,
    );

    const issueOrganism = await createOrganism(
      {
        name: 'Issue Twin',
        contentTypeId: 'github-issue' as ContentTypeId,
        payload: {
          repositoryOrganismId: 'org-repo' as OrganismId,
          sourceProposalId: 'prp-source',
          sourceOrganismId: sourceOrganism.organism.id,
          externalIssueNumber: 42,
          externalIssueUrl: 'https://github.com/omnilith-labs/omnilith/issues/42',
          title: 'Initial issue',
          body: 'Initial body',
          state: 'open',
          labels: ['automation'],
          sync: {
            status: 'pending',
          },
        },
        createdBy: linkActor,
        openTrunk: true,
      },
      createDeps,
    );

    const sensorOrganism = await createOrganism(
      {
        name: 'GitHub Issue Sensor',
        contentTypeId: 'sensor' as ContentTypeId,
        payload: {
          label: 'github-pressure',
          targetOrganismId: issueOrganism.organism.id,
          metric: 'github-issues',
          readings: [],
        },
        createdBy: sensorSteward,
        openTrunk: true,
      },
      createDeps,
    );

    const linkRow: GitHubIssueLinkRow = {
      issueOrganismId: issueOrganism.organism.id,
      repositoryOrganismId: 'org-repo',
      actorId: linkActor,
      githubIssueUrl: 'https://github.com/omnilith-labs/omnilith/issues/42',
    };
    container.db = createIssueLinkQueryDb(linkRow);

    process.env.GITHUB_ALLOWED_REPOS = 'omnilith-labs/omnilith';
    process.env.GITHUB_ISSUE_SENSOR_ORGANISM_ID = sensorOrganism.organism.id;

    const app = githubIntegrationRoutes(container);
    const response = await app.request('/webhooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'issues',
      },
      body: JSON.stringify({
        action: 'opened',
        repository: {
          owner: { login: 'omnilith-labs' },
          name: 'omnilith',
        },
        issue: {
          number: 42,
          title: 'Updated title',
          body: 'Updated body',
          state: 'open',
          html_url: 'https://github.com/omnilith-labs/omnilith/issues/42',
          labels: [{ name: 'automation' }],
        },
      }),
    });

    expect(response.status).toBe(202);

    const observationEvents = await container.eventRepository.findByOrganismId(
      sensorOrganism.organism.id,
      'organism.observed',
    );
    expect(observationEvents).toHaveLength(1);
    expect(observationEvents[0].actorId).toBe(sensorSteward);

    const payload = observationEvents[0].payload as {
      metric: string;
      value: number;
      targetOrganismId: string;
    };
    expect(payload.metric).toBe('github-issues');
    expect(payload.value).toBe(1);
    expect(payload.targetOrganismId).toBe(issueOrganism.organism.id);
  });
});
