/**
 * Template routes — instantiate organisms from template recipes.
 *
 * POST /templates/:id/instantiate reads a template organism's current state,
 * executes each recipe step to create organisms, and composes them
 * according to the recipe's composeInto directives.
 */

import type { ContentTypeId, OrganismId, UserId } from '@omnilith/kernel';
import { composeOrganism, createOrganism } from '@omnilith/kernel';
import { Hono } from 'hono';
import type { Container } from '../container.js';
import type { AuthEnv } from '../middleware/auth.js';

export function templateRoutes(container: Container) {
  const app = new Hono<AuthEnv>();

  app.post('/:id/instantiate', async (c) => {
    const templateId = c.req.param('id') as OrganismId;
    const userId = c.get('userId');

    // Load template organism
    const organism = await container.organismRepository.findById(templateId);
    if (!organism) {
      return c.json({ error: 'Template organism not found' }, 404);
    }

    const currentState = await container.stateRepository.findCurrentByOrganismId(templateId);
    if (!currentState || currentState.contentTypeId !== 'template') {
      return c.json({ error: 'Organism is not a template' }, 400);
    }

    const payload = currentState.payload as {
      recipe: ReadonlyArray<{
        ref: string;
        name?: string;
        contentTypeId: string;
        initialPayload: unknown;
        openTrunk?: boolean;
        composeInto?: string;
        position?: number;
      }>;
    };

    const createDeps = {
      organismRepository: container.organismRepository,
      stateRepository: container.stateRepository,
      contentTypeRegistry: container.contentTypeRegistry,
      eventPublisher: container.eventPublisher,
      relationshipRepository: container.relationshipRepository,
      identityGenerator: container.identityGenerator,
    };

    const composeDeps = {
      organismRepository: container.organismRepository,
      compositionRepository: container.compositionRepository,
      eventPublisher: container.eventPublisher,
      identityGenerator: container.identityGenerator,
    };

    // Execute recipe steps — create all organisms first
    const refToOrganismId = new Map<string, OrganismId>();
    const results: Array<{ ref: string; organismId: OrganismId }> = [];

    for (const step of payload.recipe) {
      const result = await createOrganism(
        {
          name: step.name ?? step.ref,
          contentTypeId: step.contentTypeId as ContentTypeId,
          payload: step.initialPayload,
          createdBy: userId,
          openTrunk: step.openTrunk,
        },
        createDeps,
      );

      refToOrganismId.set(step.ref, result.organism.id);
      results.push({ ref: step.ref, organismId: result.organism.id });
    }

    // Compose organisms according to composeInto directives
    for (const step of payload.recipe) {
      if (step.composeInto) {
        const childId = refToOrganismId.get(step.ref);
        const parentId = refToOrganismId.get(step.composeInto);
        if (!childId || !parentId) continue;

        await composeOrganism(
          {
            parentId,
            childId,
            composedBy: userId as UserId,
            position: step.position,
          },
          composeDeps,
        );
      }
    }

    return c.json({ organisms: results }, 201);
  });

  return app;
}
