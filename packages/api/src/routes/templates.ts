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

interface InstantiateTemplateStepOverride {
  readonly name?: string;
  readonly initialPayload?: unknown;
  readonly openTrunk?: boolean;
}

interface InstantiateTemplateRequest {
  readonly overrides?: Readonly<Record<string, InstantiateTemplateStepOverride>>;
}

export function templateRoutes(container: Container) {
  const app = new Hono<AuthEnv>();

  app.post('/:id/instantiate', async (c) => {
    const templateId = c.req.param('id') as OrganismId;
    const userId = c.get('userId');
    const rawBody = await c.req.text();

    let body: InstantiateTemplateRequest = {};
    if (rawBody.trim().length > 0) {
      try {
        body = JSON.parse(rawBody) as InstantiateTemplateRequest;
      } catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
      }
    }

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

    const overrides = body.overrides;
    if (overrides !== undefined) {
      if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
        return c.json({ error: 'overrides must be an object keyed by recipe ref' }, 400);
      }

      const knownRefs = new Set(payload.recipe.map((step) => step.ref));
      for (const ref of Object.keys(overrides)) {
        if (!knownRefs.has(ref)) {
          return c.json({ error: `Override references unknown recipe ref '${ref}'` }, 400);
        }
      }
    }

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
      const override = overrides?.[step.ref] as InstantiateTemplateStepOverride | undefined;
      const hasInitialPayloadOverride = !!override && Object.hasOwn(override, 'initialPayload');

      const result = await createOrganism(
        {
          name: override?.name ?? step.name ?? step.ref,
          contentTypeId: step.contentTypeId as ContentTypeId,
          payload: hasInitialPayloadOverride ? override.initialPayload : step.initialPayload,
          createdBy: userId,
          openTrunk: override?.openTrunk ?? step.openTrunk,
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
