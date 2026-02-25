/**
 * Organism routes — threshold, state, composition, query.
 */

import type {
  AppendStateRequest,
  ComposeChildRequest,
  RecordObservationRequest,
  ThresholdOrganismRequest,
  UpdateVisibilityRequest,
} from '@omnilith/api-contracts';
import type {
  ContentTypeId,
  DomainError,
  EventType,
  OrganismId,
  RelationshipType,
  Timestamp,
  UserId,
} from '@omnilith/kernel';
import {
  appendState,
  changeVisibility,
  composeOrganism,
  createOrganism,
  decomposeOrganism,
  queryChildren,
  queryParent,
  recordObservation,
} from '@omnilith/kernel';
import { desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type { Container } from '../container.js';
import { regulatorActionExecutions } from '../db/schema.js';
import type { AuthEnv } from '../middleware/auth.js';
import { deriveSurfaceEntrySize } from '../surface/derive-surface-entry-size.js';
import { parseSpatialMapPayload } from '../surface/spatial-map-payload.js';
import { parseJsonBody } from '../utils/parse-json.js';
import { requireOrganismAccess } from './access.js';

interface SurfaceOrganismOnMapRequest {
  readonly organismId: string;
  readonly x: number;
  readonly y: number;
  readonly emphasis?: number;
}

const SURFACE_APPEND_MAX_ATTEMPTS = 3;
const SURFACE_APPEND_CONFLICT_ERROR = 'Map changed concurrently while surfacing. Please retry.';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isSpatialMapTransitionConflict(issues: readonly string[]): boolean {
  return issues.some(
    (issue) => issue.startsWith('existing entry removed:') || issue.startsWith('existing entry moved:'),
  );
}

function isStateSequenceConflictError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as {
    readonly code?: string;
    readonly constraint?: string;
    readonly message?: string;
  };

  if (candidate.code !== '23505') {
    return false;
  }

  if (candidate.constraint === 'organism_states_organism_sequence_unique') {
    return true;
  }

  return (
    typeof candidate.message === 'string' && candidate.message.includes('organism_states_organism_sequence_unique')
  );
}

export function organismRoutes(container: Container) {
  const app = new Hono<AuthEnv>();

  // List organisms with query filters
  app.get('/', async (c) => {
    const filters = {
      contentTypeId: c.req.query('contentTypeId') as ContentTypeId | undefined,
      createdBy: c.req.query('createdBy') as UserId | undefined,
      parentId: c.req.query('parentId') as OrganismId | undefined,
      nameQuery: c.req.query('q') ?? undefined,
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
    if (body.contentTypeId === 'spatial-map') {
      return c.json({ error: 'spatial-map mutations must use POST /organisms/:id/surface' }, 400);
    }

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
          surfaceRepository: container.surfaceRepository,
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

  // Surface organism on map (open-trunk map flow)
  app.post('/:id/surface', async (c) => {
    const userId = c.get('userId');
    const mapId = c.req.param('id') as OrganismId;
    const body = await parseJsonBody<SurfaceOrganismOnMapRequest>(c);

    if (!body) return c.json({ error: 'Invalid JSON body' }, 400);
    if (typeof body.organismId !== 'string' || body.organismId.length === 0) {
      return c.json({ error: 'organismId is required' }, 400);
    }
    if (!isFiniteNumber(body.x) || !isFiniteNumber(body.y)) {
      return c.json({ error: 'x and y must be finite numbers' }, 400);
    }
    if (body.emphasis !== undefined && (!isFiniteNumber(body.emphasis) || body.emphasis < 0 || body.emphasis > 1)) {
      return c.json({ error: 'emphasis must be between 0 and 1 when provided' }, 400);
    }

    const accessError = await requireOrganismAccess(c, container, userId, mapId, 'append-state');
    if (accessError) return accessError;

    const targetOrganismId = body.organismId as OrganismId;
    const targetExists = await container.organismRepository.exists(targetOrganismId);
    if (!targetExists) return c.json({ error: `Organism not found: ${targetOrganismId}` }, 404);

    const derived = await deriveSurfaceEntrySize(
      { organismId: targetOrganismId, mapOrganismId: mapId },
      {
        organismRepository: container.organismRepository,
        stateRepository: container.stateRepository,
        compositionRepository: container.compositionRepository,
        surfaceRepository: container.surfaceRepository,
      },
    );

    const entry = {
      organismId: targetOrganismId,
      x: body.x,
      y: body.y,
      size: derived.size,
      emphasis: body.emphasis,
    };

    for (let attempt = 1; attempt <= SURFACE_APPEND_MAX_ATTEMPTS; attempt++) {
      const currentMapState = await container.stateRepository.findCurrentByOrganismId(mapId);
      if (!currentMapState) {
        return c.json({ error: `Organism not found: ${mapId}` }, 404);
      }
      if (currentMapState.contentTypeId !== 'spatial-map') {
        return c.json({ error: 'Target organism is not a spatial-map' }, 400);
      }

      const mapPayload = parseSpatialMapPayload(currentMapState.payload);
      if (!mapPayload) {
        return c.json({ error: 'Spatial-map payload is invalid' }, 400);
      }

      const existing = mapPayload.entries.find((existingEntry) => existingEntry.organismId === targetOrganismId);
      if (existing) {
        return c.json({ status: 'already-surfaced', entry: existing });
      }

      const payload = {
        entries: [...mapPayload.entries, entry],
        width: mapPayload.width,
        height: mapPayload.height,
        ...(mapPayload.minSeparation !== undefined ? { minSeparation: mapPayload.minSeparation } : {}),
      };

      try {
        const state = await appendState(
          {
            organismId: mapId,
            contentTypeId: 'spatial-map' as ContentTypeId,
            payload,
            appendedBy: userId,
          },
          {
            organismRepository: container.organismRepository,
            stateRepository: container.stateRepository,
            contentTypeRegistry: container.contentTypeRegistry,
            eventPublisher: container.eventPublisher,
            identityGenerator: container.identityGenerator,
            visibilityRepository: container.visibilityRepository,
            surfaceRepository: container.surfaceRepository,
            relationshipRepository: container.relationshipRepository,
            compositionRepository: container.compositionRepository,
          },
        );

        return c.json({ status: 'surfaced', entry, state, derived }, 201);
      } catch (err) {
        const e = err as DomainError;

        if (e.kind === 'AccessDeniedError') return c.json({ error: e.message }, 403);
        if (e.kind === 'OrganismNotFoundError') return c.json({ error: e.message }, 404);

        const retryableSpatialMapValidation =
          e.kind === 'ValidationFailedError' &&
          e.contentTypeId === 'spatial-map' &&
          isSpatialMapTransitionConflict(e.issues);
        const retryableSequenceConflict = isStateSequenceConflictError(err);

        if ((retryableSpatialMapValidation || retryableSequenceConflict) && attempt < SURFACE_APPEND_MAX_ATTEMPTS) {
          continue;
        }

        if (retryableSpatialMapValidation || retryableSequenceConflict) {
          return c.json({ error: SURFACE_APPEND_CONFLICT_ERROR }, 409);
        }

        if (e.kind === 'ValidationFailedError') return c.json({ error: e.message }, 400);
        throw err;
      }
    }

    return c.json({ error: SURFACE_APPEND_CONFLICT_ERROR }, 409);
  });

  // Record observation event
  app.post('/:id/observations', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id') as OrganismId;
    const body = await parseJsonBody<RecordObservationRequest>(c);

    if (!body) return c.json({ error: 'Invalid JSON body' }, 400);
    if (typeof body.targetOrganismId !== 'string' || body.targetOrganismId.length === 0) {
      return c.json({ error: 'targetOrganismId is required' }, 400);
    }
    if (typeof body.metric !== 'string' || body.metric.trim().length === 0) {
      return c.json({ error: 'metric is required' }, 400);
    }
    if (typeof body.value !== 'number' || !Number.isFinite(body.value)) {
      return c.json({ error: 'value must be a finite number' }, 400);
    }
    if (typeof body.sampledAt !== 'number' || !Number.isFinite(body.sampledAt)) {
      return c.json({ error: 'sampledAt must be a finite number' }, 400);
    }

    try {
      const event = await recordObservation(
        {
          organismId: id,
          targetOrganismId: body.targetOrganismId as OrganismId,
          metric: body.metric,
          value: body.value,
          sampledAt: body.sampledAt as Timestamp,
          observedBy: userId,
        },
        {
          organismRepository: container.organismRepository,
          eventPublisher: container.eventPublisher,
          identityGenerator: container.identityGenerator,
          visibilityRepository: container.visibilityRepository,
          surfaceRepository: container.surfaceRepository,
          relationshipRepository: container.relationshipRepository,
          compositionRepository: container.compositionRepository,
        },
      );

      return c.json({ event }, 201);
    } catch (err) {
      const e = err as DomainError;
      if (e.kind === 'AccessDeniedError') return c.json({ error: e.message }, 403);
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

  // Query children with organism + current state in one response
  app.get('/:id/children-with-state', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id') as OrganismId;
    const accessError = await requireOrganismAccess(c, container, userId, id, 'view');
    if (accessError) return accessError;

    const children = await queryChildren(id, {
      compositionRepository: container.compositionRepository,
    });

    const childrenWithState = await Promise.all(
      children.map(async (composition) => {
        const organism = await container.organismRepository.findById(composition.childId);
        if (!organism) {
          return null;
        }

        const currentState = await container.stateRepository.findCurrentByOrganismId(composition.childId);
        return {
          composition,
          organism,
          currentState: currentState ?? null,
        };
      }),
    );

    return c.json({
      children: childrenWithState.filter((child): child is NonNullable<typeof child> => child !== null),
    });
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
          visibilityRepository: container.visibilityRepository,
          surfaceRepository: container.surfaceRepository,
          relationshipRepository: container.relationshipRepository,
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
          organismRepository: container.organismRepository,
          compositionRepository: container.compositionRepository,
          visibilityRepository: container.visibilityRepository,
          surfaceRepository: container.surfaceRepository,
          relationshipRepository: container.relationshipRepository,
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

  // Action executions
  app.get('/:id/action-executions', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id') as OrganismId;
    const accessError = await requireOrganismAccess(c, container, userId, id, 'view');
    if (accessError) return accessError;

    if (!container.db) {
      return c.json({ executions: [] });
    }

    const limitRaw = Number(c.req.query('limit'));
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 50;

    const rows = await container.db
      .select({
        id: regulatorActionExecutions.id,
        boundaryOrganismId: regulatorActionExecutions.boundaryOrganismId,
        actionOrganismId: regulatorActionExecutions.actionOrganismId,
        triggerPolicyOrganismId: regulatorActionExecutions.triggerPolicyOrganismId,
        executionMode: regulatorActionExecutions.executionMode,
        status: regulatorActionExecutions.status,
        idempotencyKey: regulatorActionExecutions.idempotencyKey,
        attemptCount: regulatorActionExecutions.attemptCount,
        startedAt: regulatorActionExecutions.startedAt,
        completedAt: regulatorActionExecutions.completedAt,
        nextAttemptAt: regulatorActionExecutions.nextAttemptAt,
        lastError: regulatorActionExecutions.lastError,
        result: regulatorActionExecutions.result,
        createdAt: regulatorActionExecutions.createdAt,
        updatedAt: regulatorActionExecutions.updatedAt,
      })
      .from(regulatorActionExecutions)
      .where(eq(regulatorActionExecutions.boundaryOrganismId, id))
      .orderBy(desc(regulatorActionExecutions.createdAt))
      .limit(limit);

    return c.json({
      executions: rows.map((row) => ({
        ...row,
        startedAt: row.startedAt ? row.startedAt.getTime() : null,
        completedAt: row.completedAt ? row.completedAt.getTime() : null,
        nextAttemptAt: row.nextAttemptAt.getTime(),
        createdAt: row.createdAt.getTime(),
        updatedAt: row.updatedAt.getTime(),
      })),
    });
  });

  // Contributions
  app.get('/:id/contributions', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id') as OrganismId;
    const accessError = await requireOrganismAccess(c, container, userId, id, 'view');
    if (accessError) return accessError;

    const contributions = await container.queryPort.getOrganismContributions(id);
    return c.json({ contributions });
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
    if (record) {
      return c.json({ visibility: record });
    }

    const surfaced = await container.surfaceRepository.isSurfaced(id);
    return c.json({
      visibility: {
        organismId: id,
        level: surfaced ? 'public' : 'private',
      },
    });
  });

  app.put('/:id/visibility', async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id') as OrganismId;
    const body = await parseJsonBody<UpdateVisibilityRequest>(c);

    if (!body) return c.json({ error: 'Invalid JSON body' }, 400);

    try {
      await changeVisibility(
        {
          organismId: id,
          level: body.level,
          changedBy: userId,
        },
        {
          organismRepository: container.organismRepository,
          visibilityRepository: container.visibilityRepository,
          surfaceRepository: container.surfaceRepository,
          relationshipRepository: container.relationshipRepository,
          compositionRepository: container.compositionRepository,
          eventPublisher: container.eventPublisher,
          identityGenerator: container.identityGenerator,
        },
      );
      return c.json({ ok: true });
    } catch (err) {
      const e = err as DomainError;
      if (e.kind === 'AccessDeniedError') return c.json({ error: e.message }, 403);
      if (e.kind === 'OrganismNotFoundError') return c.json({ error: e.message }, 404);
      throw err;
    }
  });

  return app;
}
