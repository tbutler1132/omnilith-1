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
  db: Database;
}

export function createContainer(db: Database): Container {
  const contentTypeRegistry = createContentTypeRegistry();
  return {
    organismRepository: new PgOrganismRepository(db),
    stateRepository: new PgStateRepository(db),
    compositionRepository: new PgCompositionRepository(db),
    proposalRepository: new PgProposalRepository(db),
    eventPublisher: new PgEventPublisher(db),
    eventRepository: new PgEventRepository(db),
    visibilityRepository: new PgVisibilityRepository(db),
    relationshipRepository: new PgRelationshipRepository(db),
    contentTypeRegistry,
    identityGenerator: new UuidIdentityGenerator(),
    queryPort: new PgQueryPort(db),
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
