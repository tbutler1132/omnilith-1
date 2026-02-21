/**
 * Container — composition root for the API.
 *
 * Creates all adapters and wires them into kernel use cases.
 * This is the single place where the dependency graph is assembled.
 */

import { allContentTypes } from '@omnilith/content-types';
import type {
  CompositionRepository,
  ContentTypeContract,
  ContentTypeRegistry,
  EventPublisher,
  EventRepository,
  IdentityGenerator,
  OrganismRepository,
  ProposalRepository,
  QueryPort,
  RelationshipRepository,
  StateRepository,
  VisibilityRepository,
} from '@omnilith/kernel';
import { UuidIdentityGenerator } from './adapters/identity-generator.js';
import { PgCompositionRepository } from './adapters/pg-composition-repository.js';
import { PgEventPublisher } from './adapters/pg-event-publisher.js';
import { PgEventRepository } from './adapters/pg-event-repository.js';
import { PgOrganismRepository } from './adapters/pg-organism-repository.js';
import { PgProposalRepository } from './adapters/pg-proposal-repository.js';
import { PgQueryPort } from './adapters/pg-query-port.js';
import { PgRelationshipRepository } from './adapters/pg-relationship-repository.js';
import { PgStateRepository } from './adapters/pg-state-repository.js';
import { PgVisibilityRepository } from './adapters/pg-visibility-repository.js';
import type { Database } from './db/connection.js';
import { createGitHubPlugin, type GitHubPlugin } from './github/plugin.js';
import type { ProposalIntegrationTrigger } from './github/proposal-integration-trigger.js';

export interface Container {
  organismRepository: OrganismRepository;
  stateRepository: StateRepository;
  compositionRepository: CompositionRepository;
  proposalRepository: ProposalRepository;
  eventPublisher: EventPublisher;
  eventRepository: EventRepository;
  visibilityRepository: VisibilityRepository;
  relationshipRepository: RelationshipRepository;
  contentTypeRegistry: ContentTypeRegistry;
  identityGenerator: IdentityGenerator;
  queryPort: QueryPort;
  proposalIntegrationTrigger: ProposalIntegrationTrigger;
  githubPlugin: GitHubPlugin;
  db: Database;
}

export function createContainer(db: Database): Container {
  const contentTypeRegistry = createContentTypeRegistry();
  const organismRepository = new PgOrganismRepository(db);
  const stateRepository = new PgStateRepository(db);
  const compositionRepository = new PgCompositionRepository(db);
  const proposalRepository = new PgProposalRepository(db);
  const eventPublisher = new PgEventPublisher(db);
  const eventRepository = new PgEventRepository(db);
  const visibilityRepository = new PgVisibilityRepository(db);
  const relationshipRepository = new PgRelationshipRepository(db);
  const identityGenerator = new UuidIdentityGenerator();
  const queryPort = new PgQueryPort(db);
  const githubPlugin = createGitHubPlugin({
    db,
    compositionRepository,
    stateRepository,
  });
  const proposalIntegrationTrigger = githubPlugin.proposalIntegrationTrigger;

  return {
    organismRepository,
    stateRepository,
    compositionRepository,
    proposalRepository,
    eventPublisher,
    eventRepository,
    visibilityRepository,
    relationshipRepository,
    contentTypeRegistry,
    identityGenerator,
    queryPort,
    proposalIntegrationTrigger,
    githubPlugin,
    db,
  };
}

function createContentTypeRegistry(): ContentTypeRegistry {
  const types = new Map<string, ContentTypeContract>();
  const registry: ContentTypeRegistry = {
    register(contract) {
      types.set(contract.typeId, contract);
    },
    get(typeId) {
      return types.get(typeId);
    },
    has(typeId) {
      return types.has(typeId);
    },
    getAll() {
      return [...types.values()];
    },
  };

  for (const ct of allContentTypes) {
    registry.register(ct);
  }

  return registry;
}
