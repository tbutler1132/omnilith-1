/**
 * Organism routes — threshold, state, composition, query.
 */

import type {
  AppendStateRequest,
  ComposeChildRequest,
  ContentTypeId,
  DomainError,
  EventType,
  OrganismId,
  RelationshipType,
  ThresholdOrganismRequest,
  UpdateVisibilityRequest,
  UserId,
} from '@omnilith/kernel';
import {
  appendState,
  composeOrganism,
  createOrganism,
  decomposeOrganism,
  queryChildren,
  queryParent,
} from '@omnilith/kernel';
import { Hono } from 'hono';
import type { Container } from '../container.js';
import type { AuthEnv } from '../middleware/auth.js';
import { parseJsonBody } from '../utils/parse-json.js';
import { requireOrganismAccess } from './access.js';

export function organismRoutes(container: Container) {
  const app = new Hono<AuthEnv>();

  // List organisms with query filters
  app.get('/', async (c) => {
    const filters = {
      contentTypeId: c.req.query('contentTypeId') as ContentTypeId | undefined,
      createdBy: c.req.query('createdBy') as UserId | undefined,
      parentId: c.req.query('parentId') as OrganismId | undefined,
      limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
      offset: c.req.query('offset') ? Number(c.req.query('offset')) : undefined,
    };

    const results = await container.queryPort.findOrganismsWithState(filters);
    return c.json({ organisms: results });
  });

  // Threshold — create organism
  app.post('/', async (c) => {
    const userId = c.get('userId');
    const body = await parseJsonBody<ThresholdOrganismRequest>(c);

    if (!body) return c.json({ error: 'Invalid JSON body' }, 400);
    if (!body.name || typeof body.name !== 'string') return c.json({ error: 'Name is required' }, 400);

    try {
      const result = await createOrganism(
        {
          name: body.name,
          contentTypeId: body.contentTypeId as ContentTypeId,
          payload: body.payload,
          createdBy: userId,
          openTrunk: body.openTrunk,
        },
        {
          organismRepository: container.organismRepository,
          stateRepository: container.stateRepository,
          contentTypeRegistry: container.contentTypeRegistry,
          eventPublisher: container.eventPublisher,
          relationshipRepository: container.relationshipRepository,
          identityGenerator: container.identityGenerator,
        },
      );

      return c.json(
        {
          organism: result.organism,
          initialState: result.initialState,
        },
        201,
      );
    } catch (err) {
      const e = err as DomainError;
      if (e.kind === 'ValidationFailedError') return c.json({ error: e.message }, 400);
      if (e.kind === 'ContentTypeNotRegisteredError') return c.json({ error: e.message }, 400);
      throw err;
    }
  });

  // Get organism with current state
  app.get('/:id', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id') as OrganismId;
    const accessError = await requireOrganismAccess(c, container, userId, id, 'view');
    if (accessError) return accessError;

    const organism = await container.organismRepository.findById(id);
    if (!organism) return c.json({ error: 'Not found' }, 404);

    const currentState = await container.stateRepository.findCurrentByOrganismId(id);
    return c.json({ organism, currentState });
  });

  // State history
  app.get('/:id/states', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id') as OrganismId;
    const accessError = await requireOrganismAccess(c, container, userId, id, 'view');
    if (accessError) return accessError;

    const history = await container.stateRepository.findHistoryByOrganismId(id);
    return c.json({ states: history });
  });

  // Append state (open-trunk only)
  app.post('/:id/states', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id') as OrganismId;
    const body = await parseJsonBody<AppendStateRequest>(c);

    if (!body) return c.json({ error: 'Invalid JSON body' }, 400);

    try {
      const state = await appendState(
        {
          organismId: id,
          contentTypeId: body.contentTypeId as ContentTypeId,
          payload: body.payload,
          appendedBy: userId,
        },
        {
          organismRepository: container.organismRepository,
          stateRepository: container.stateRepository,
          contentTypeRegistry: container.contentTypeRegistry,
          eventPublisher: container.eventPublisher,
          identityGenerator: container.identityGenerator,
          visibilityRepository: container.visibilityRepository,
          relationshipRepository: container.relationshipRepository,
          compositionRepository: container.compositionRepository,
        },
      );

      return c.json({ state }, 201);
    } catch (err) {
      const e = err as DomainError;
      if (e.kind === 'AccessDeniedError') return c.json({ error: e.message }, 403);
      if (e.kind === 'OrganismNotFoundError') return c.json({ error: e.message }, 404);
      if (e.kind === 'ValidationFailedError') return c.json({ error: e.message }, 400);
      throw err;
    }
  });

  // Query parent composition record
  app.get('/:id/parent', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id') as OrganismId;
    const accessError = await requireOrganismAccess(c, container, userId, id, 'view');
    if (accessError) return accessError;

    const parent = await queryParent(id, {
      compositionRepository: container.compositionRepository,
    });
    return c.json({ parent: parent ?? null });
  });

  // Query children
  app.get('/:id/children', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id') as OrganismId;
    const accessError = await requireOrganismAccess(c, container, userId, id, 'view');
    if (accessError) return accessError;

    const children = await queryChildren(id, {
      compositionRepository: container.compositionRepository,
    });
    return c.json({ children });
  });

  // Compose child into parent
  app.post('/:id/children', async (c) => {
    const userId = c.get('userId');
    const parentId = c.req.param('id') as OrganismId;
    const body = await parseJsonBody<ComposeChildRequest>(c);

    if (!body) return c.json({ error: 'Invalid JSON body' }, 400);
    const accessError = await requireOrganismAccess(c, container, userId, parentId, 'compose');
    if (accessError) return accessError;

    try {
      const record = await composeOrganism(
        {
          parentId,
          childId: body.childId as OrganismId,
          composedBy: userId,
          position: body.position,
        },
        {
          organismRepository: container.organismRepository,
          compositionRepository: container.compositionRepository,
          eventPublisher: container.eventPublisher,
          identityGenerator: container.identityGenerator,
        },
      );

      return c.json({ composition: record }, 201);
    } catch (err) {
      const e = err as DomainError;
      if (e.kind === 'CompositionError') return c.json({ error: e.message }, 409);
      if (e.kind === 'OrganismNotFoundError') return c.json({ error: e.message }, 404);
      throw err;
    }
  });

  // Decompose
  app.delete('/:id/children/:childId', async (c) => {
    const userId = c.get('userId');
    const parentId = c.req.param('id') as OrganismId;
    const childId = c.req.param('childId') as OrganismId;
    const accessError = await requireOrganismAccess(c, container, userId, parentId, 'decompose');
    if (accessError) return accessError;

    try {
      await decomposeOrganism(
        { parentId, childId, decomposedBy: userId },
        {
          compositionRepository: container.compositionRepository,
          eventPublisher: container.eventPublisher,
          identityGenerator: container.identityGenerator,
        },
      );

      return c.json({ ok: true });
    } catch (err) {
      const e = err as DomainError;
      if (e.kind === 'CompositionError') return c.json({ error: e.message }, 404);
      throw err;
    }
  });

  // Vitality
  app.get('/:id/vitality', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id') as OrganismId;
    const accessError = await requireOrganismAccess(c, container, userId, id, 'view');
    if (accessError) return accessError;

    const vitality = await container.queryPort.getVitality(id);
    return c.json({ vitality });
  });

  // Events
  app.get('/:id/events', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id') as OrganismId;
    const accessError = await requireOrganismAccess(c, container, userId, id, 'view');
    if (accessError) return accessError;

    const type = c.req.query('type') as EventType | undefined;
    const events = await container.eventRepository.findByOrganismId(id, type);
    return c.json({ events });
  });

  // Relationships
  app.get('/:id/relationships', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id') as OrganismId;
    const accessError = await requireOrganismAccess(c, container, userId, id, 'view');
    if (accessError) return accessError;

    const type = c.req.query('type') as RelationshipType | undefined;
    const relationships = await container.relationshipRepository.findByOrganism(id, type || undefined);
    return c.json({ relationships });
  });

  // Visibility
  app.get('/:id/visibility', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id') as OrganismId;
    const accessError = await requireOrganismAccess(c, container, userId, id, 'view');
    if (accessError) return accessError;

    const record = await container.visibilityRepository.findByOrganismId(id);
    return c.json({ visibility: record ?? { organismId: id, level: 'public' } });
  });

  app.put('/:id/visibility', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id') as OrganismId;
    const body = await parseJsonBody<UpdateVisibilityRequest>(c);

    if (!body) return c.json({ error: 'Invalid JSON body' }, 400);

    const accessError = await requireOrganismAccess(c, container, userId, id, 'change-visibility');
    if (accessError) return accessError;

    await container.visibilityRepository.save({
      organismId: id,
      level: body.level,
      updatedAt: container.identityGenerator.timestamp(),
    });

    return c.json({ ok: true });
  });

  return app;
}
