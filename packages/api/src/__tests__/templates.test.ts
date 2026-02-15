/**
 * Template instantiation tests — verify template recipes create and compose organisms.
 */

import { allContentTypes } from '@omnilith/content-types';
import type { ContentTypeRegistry, OrganismId, UserId } from '@omnilith/kernel';
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
import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Container } from '../container.js';
import type { AuthEnv } from '../middleware/auth.js';
import { organismRoutes } from '../routes/organisms.js';
import { templateRoutes } from '../routes/templates.js';

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
      relationshipRepository,
    ),
    db: null as unknown as Container['db'],
  };
}

function createTestApp(container: Container) {
  const testUserId = 'test-user' as UserId;

  const app = new Hono<AuthEnv>();
  app.use('*', async (c, next) => {
    c.set('userId', testUserId);
    await next();
  });
  app.route('/organisms', organismRoutes(container));
  app.route('/templates', templateRoutes(container));

  return { app, testUserId };
}

describe('template instantiation', () => {
  let container: Container;
  let app: Hono<AuthEnv>;

  beforeEach(() => {
    resetIdCounter();
    container = createTestContainer();
    const setup = createTestApp(container);
    app = setup.app;
  });

  async function createTemplateOrganism(recipe: unknown[]) {
    const res = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test template',
        contentTypeId: 'template',
        payload: {
          name: 'Test template',
          description: 'A test template',
          recipe,
        },
      }),
    });
    const body = await res.json();
    return body.organism as { id: OrganismId };
  }

  it('instantiating a valid template creates all organisms', async () => {
    const template = await createTemplateOrganism([
      { ref: 'page', contentTypeId: 'text', initialPayload: { content: '# Home', format: 'markdown' } },
    ]);

    const res = await app.request(`/templates/${template.id}/instantiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.organisms).toHaveLength(1);
    expect(body.organisms[0].ref).toBe('page');
    expect(body.organisms[0].organismId).toBeDefined();
  });

  it('organisms with composeInto are composed into their parent', async () => {
    const template = await createTemplateOrganism([
      {
        ref: 'album',
        contentTypeId: 'composition-reference',
        initialPayload: { entries: [], arrangementType: 'sequential' },
      },
      {
        ref: 'track',
        contentTypeId: 'text',
        initialPayload: { content: 'track 1', format: 'plaintext' },
        composeInto: 'album',
        position: 0,
      },
    ]);

    const res = await app.request(`/templates/${template.id}/instantiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.organisms).toHaveLength(2);

    // Verify composition
    const albumId = body.organisms.find((o: { ref: string }) => o.ref === 'album').organismId;
    const trackId = body.organisms.find((o: { ref: string }) => o.ref === 'track').organismId;

    const children = await container.compositionRepository.findChildren(albumId);
    expect(children).toHaveLength(1);
    expect(children[0].childId).toBe(trackId);
  });

  it('returns ref to organismId mapping', async () => {
    const template = await createTemplateOrganism([
      { ref: 'a', contentTypeId: 'text', initialPayload: { content: 'a', format: 'plaintext' } },
      { ref: 'b', contentTypeId: 'text', initialPayload: { content: 'b', format: 'plaintext' } },
    ]);

    const res = await app.request(`/templates/${template.id}/instantiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const body = await res.json();
    expect(body.organisms).toHaveLength(2);
    expect(body.organisms[0].ref).toBe('a');
    expect(body.organisms[1].ref).toBe('b');
    expect(body.organisms[0].organismId).not.toBe(body.organisms[1].organismId);
  });

  it('returns 404 for nonexistent template organism', async () => {
    const res = await app.request('/templates/nonexistent/instantiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(404);
  });

  it('returns 400 if organism is not a template content type', async () => {
    // Create a non-template organism
    const createRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Not a Template',
        contentTypeId: 'text',
        payload: { content: 'not a template', format: 'plaintext' },
      }),
    });
    const { organism } = await createRes.json();

    const res = await app.request(`/templates/${organism.id}/instantiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(400);
  });
});
