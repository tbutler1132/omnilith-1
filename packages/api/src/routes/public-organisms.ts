/**
 * Public organism routes — read-only access for unauthenticated visitors.
 *
 * Exposes a strictly read-only subset of organism endpoints under /public.
 * Access is resolved through the kernel access-control module using a guest
 * caller path. Non-public organisms resolve as 404 to avoid leakage.
 */

import type { EventType, OrganismId, RelationshipType } from '@omnilith/kernel';
import { queryChildren, queryParent } from '@omnilith/kernel';
import { desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type { Container } from '../container.js';
import { regulatorActionExecutions } from '../db/schema.js';
import { requirePublicOrganismView } from './access.js';

export function publicOrganismRoutes(container: Container) {
  const app = new Hono();

  app.get('/:id', async (c) => {
    const id = c.req.param('id') as OrganismId;
    const accessError = await requirePublicOrganismView(c, container, id);
    if (accessError) return accessError;

    const organism = await container.organismRepository.findById(id);
    if (!organism) return c.json({ error: 'Not found' }, 404);

    const currentState = await container.stateRepository.findCurrentByOrganismId(id);
    return c.json({ organism, currentState });
  });

  app.get('/:id/states', async (c) => {
    const id = c.req.param('id') as OrganismId;
    const accessError = await requirePublicOrganismView(c, container, id);
    if (accessError) return accessError;

    const states = await container.stateRepository.findHistoryByOrganismId(id);
    return c.json({ states });
  });

  app.get('/:id/parent', async (c) => {
    const id = c.req.param('id') as OrganismId;
    const accessError = await requirePublicOrganismView(c, container, id);
    if (accessError) return accessError;

    const parent = await queryParent(id, {
      compositionRepository: container.compositionRepository,
    });
    return c.json({ parent: parent ?? null });
  });

  app.get('/:id/children', async (c) => {
    const id = c.req.param('id') as OrganismId;
    const accessError = await requirePublicOrganismView(c, container, id);
    if (accessError) return accessError;

    const children = await queryChildren(id, {
      compositionRepository: container.compositionRepository,
    });
    return c.json({ children });
  });

  app.get('/:id/children-with-state', async (c) => {
    const id = c.req.param('id') as OrganismId;
    const accessError = await requirePublicOrganismView(c, container, id);
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

  app.get('/:id/vitality', async (c) => {
    const id = c.req.param('id') as OrganismId;
    const accessError = await requirePublicOrganismView(c, container, id);
    if (accessError) return accessError;

    const vitality = await container.queryPort.getVitality(id);
    return c.json({ vitality });
  });

  app.get('/:id/events', async (c) => {
    const id = c.req.param('id') as OrganismId;
    const accessError = await requirePublicOrganismView(c, container, id);
    if (accessError) return accessError;

    const type = c.req.query('type') as EventType | undefined;
    const events = await container.eventRepository.findByOrganismId(id, type);
    return c.json({ events });
  });

  app.get('/:id/action-executions', async (c) => {
    const id = c.req.param('id') as OrganismId;
    const accessError = await requirePublicOrganismView(c, container, id);
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

  app.get('/:id/contributions', async (c) => {
    const id = c.req.param('id') as OrganismId;
    const accessError = await requirePublicOrganismView(c, container, id);
    if (accessError) return accessError;

    const contributions = await container.queryPort.getOrganismContributions(id);
    return c.json({ contributions });
  });

  app.get('/:id/relationships', async (c) => {
    const id = c.req.param('id') as OrganismId;
    const accessError = await requirePublicOrganismView(c, container, id);
    if (accessError) return accessError;

    const type = c.req.query('type') as RelationshipType | undefined;
    const relationships = await container.relationshipRepository.findByOrganism(id, type || undefined);
    return c.json({ relationships });
  });

  app.get('/:id/visibility', async (c) => {
    const id = c.req.param('id') as OrganismId;
    const accessError = await requirePublicOrganismView(c, container, id);
    if (accessError) return accessError;

    const visibility = await container.visibilityRepository.findByOrganismId(id);
    if (visibility) {
      return c.json({ visibility });
    }

    const surfaced = await container.surfaceRepository.isSurfaced(id);
    return c.json({
      visibility: {
        organismId: id,
        level: surfaced ? 'public' : 'private',
      },
    });
  });

  app.get('/:id/proposals', async (c) => {
    const id = c.req.param('id') as OrganismId;
    const accessError = await requirePublicOrganismView(c, container, id);
    if (accessError) return accessError;

    const proposals = await container.proposalRepository.findByOrganismId(id);
    return c.json({ proposals });
  });

  return app;
}
