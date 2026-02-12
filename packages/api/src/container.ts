/**
 * Container — composition root for the API.
 *
 * Creates all adapters and wires them into kernel use cases.
 * This is the single place where the dependency graph is assembled.
 */

import type {
  ContentTypeRegistry,
  OrganismRepository,
  StateRepository,
  CompositionRepository,
  ProposalRepository,
  EventPublisher,
  VisibilityRepository,
  RelationshipRepository,
  IdentityGenerator,
} from '@omnilith/kernel';
import { allContentTypes } from '@omnilith/content-types';
import type { Database } from './db/connection.js';
import { PgOrganismRepository } from './adapters/pg-organism-repository.js';
import { PgStateRepository } from './adapters/pg-state-repository.js';
import { PgCompositionRepository } from './adapters/pg-composition-repository.js';
import { PgProposalRepository } from './adapters/pg-proposal-repository.js';
import { PgEventPublisher } from './adapters/pg-event-publisher.js';
import { PgVisibilityRepository } from './adapters/pg-visibility-repository.js';
import { PgRelationshipRepository } from './adapters/pg-relationship-repository.js';
import { UuidIdentityGenerator } from './adapters/identity-generator.js';

export interface Container {
  organismRepository: OrganismRepository;
  stateRepository: StateRepository;
  compositionRepository: CompositionRepository;
  proposalRepository: ProposalRepository;
  eventPublisher: EventPublisher;
  visibilityRepository: VisibilityRepository;
  relationshipRepository: RelationshipRepository;
  contentTypeRegistry: ContentTypeRegistry;
  identityGenerator: IdentityGenerator;
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
    visibilityRepository: new PgVisibilityRepository(db),
    relationshipRepository: new PgRelationshipRepository(db),
    contentTypeRegistry,
    identityGenerator: new UuidIdentityGenerator(),
    db,
  };
}

function createContentTypeRegistry(): ContentTypeRegistry {
  const types = new Map<string, any>();
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
