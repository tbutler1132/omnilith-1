/**
 * API route tests — verify the HTTP adapter works end-to-end.
 *
 * Uses in-memory adapters from the kernel testing module to avoid
 * database dependencies. Tests the full round trip: HTTP request →
 * route handler → kernel use case → in-memory adapter → response.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type {
  UserId,
  OrganismId,
  ContentTypeId,
  ContentTypeRegistry,
} from '@omnilith/kernel';
import { allContentTypes } from '@omnilith/content-types';
import {
  InMemoryOrganismRepository,
  InMemoryStateRepository,
  InMemoryCompositionRepository,
  InMemoryProposalRepository,
  InMemoryEventPublisher,
  InMemoryVisibilityRepository,
  InMemoryRelationshipRepository,
  InMemoryContentTypeRegistry,
  createTestIdentityGenerator,
  resetIdCounter,
} from '@omnilith/kernel/src/testing/index.js';
import { organismRoutes } from '../routes/organisms.js';
import { proposalRoutes } from '../routes/proposals.js';
import type { Container } from '../container.js';
import type { AuthEnv } from '../middleware/auth.js';

function createTestContainer(): Container {
  const registry = new InMemoryContentTypeRegistry();
  for (const ct of allContentTypes) {
    registry.register(ct);
  }

  return {
    organismRepository: new InMemoryOrganismRepository(),
    stateRepository: new InMemoryStateRepository(),
    compositionRepository: new InMemoryCompositionRepository(),
    proposalRepository: new InMemoryProposalRepository(),
    eventPublisher: new InMemoryEventPublisher(),
    visibilityRepository: new InMemoryVisibilityRepository(),
    relationshipRepository: new InMemoryRelationshipRepository(),
    contentTypeRegistry: registry as ContentTypeRegistry,
    identityGenerator: createTestIdentityGenerator(),
    db: null as any, // Not used in these tests
  };
}

function createTestApp(container: Container) {
  const testUserId = 'test-user' as UserId;

  // Create app with a mock auth middleware that injects a fixed userId
  const app = new Hono<AuthEnv>();
  app.use('*', async (c, next) => {
    c.set('userId', testUserId);
    await next();
  });
  app.route('/organisms', organismRoutes(container));
  app.route('/', proposalRoutes(container));

  return { app, testUserId };
}

describe('organism routes', () => {
  let container: Container;
  let app: Hono<AuthEnv>;
  let testUserId: UserId;

  beforeEach(() => {
    resetIdCounter();
    container = createTestContainer();
    const setup = createTestApp(container);
    app = setup.app;
    testUserId = setup.testUserId;
  });

  it('POST /organisms creates an organism (threshold)', async () => {
    const res = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentTypeId: 'text',
        payload: { content: '# Hello World', format: 'markdown' },
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.organism).toBeDefined();
    expect(body.initialState).toBeDefined();
    expect(body.initialState.sequenceNumber).toBe(1);
  });

  it('GET /organisms/:id returns organism with current state', async () => {
    // Create first
    const createRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentTypeId: 'text',
        payload: { content: 'test', format: 'plaintext' },
      }),
    });
    const { organism } = await createRes.json();

    const res = await app.request(`/organisms/${organism.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.organism.id).toBe(organism.id);
    expect(body.currentState).toBeDefined();
  });

  it('GET /organisms/:id returns 404 for nonexistent organism', async () => {
    const res = await app.request('/organisms/nonexistent');
    expect(res.status).toBe(404);
  });

  it('POST /organisms/:id/states appends state to open-trunk organism', async () => {
    const createRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentTypeId: 'text',
        payload: { content: 'v1', format: 'plaintext' },
        openTrunk: true,
      }),
    });
    const { organism } = await createRes.json();

    const res = await app.request(`/organisms/${organism.id}/states`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentTypeId: 'text',
        payload: { content: 'v2', format: 'plaintext' },
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.state.sequenceNumber).toBe(2);
  });

  it('POST /organisms/:id/states rejects non-open-trunk organism', async () => {
    const createRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentTypeId: 'text',
        payload: { content: 'v1', format: 'plaintext' },
        openTrunk: false,
      }),
    });
    const { organism } = await createRes.json();

    const res = await app.request(`/organisms/${organism.id}/states`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentTypeId: 'text',
        payload: { content: 'v2', format: 'plaintext' },
      }),
    });

    expect(res.status).toBe(403);
  });

  it('POST /organisms/:id/children composes organisms', async () => {
    const parentRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentTypeId: 'text',
        payload: { content: 'album', format: 'plaintext' },
      }),
    });
    const { organism: parent } = await parentRes.json();

    const childRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentTypeId: 'text',
        payload: { content: 'song', format: 'plaintext' },
      }),
    });
    const { organism: child } = await childRes.json();

    const res = await app.request(`/organisms/${parent.id}/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: child.id }),
    });

    expect(res.status).toBe(201);

    // Verify with query
    const childrenRes = await app.request(`/organisms/${parent.id}/children`);
    const { children } = await childrenRes.json();
    expect(children).toHaveLength(1);
    expect(children[0].childId).toBe(child.id);
  });
});

describe('proposal routes', () => {
  let container: Container;
  let app: Hono<AuthEnv>;
  let testUserId: UserId;

  beforeEach(() => {
    resetIdCounter();
    container = createTestContainer();
    const setup = createTestApp(container);
    app = setup.app;
    testUserId = setup.testUserId;
  });

  it('full proposal lifecycle: open → integrate', async () => {
    // Create organism
    const createRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentTypeId: 'text',
        payload: { content: 'v1', format: 'plaintext' },
      }),
    });
    const { organism } = await createRes.json();

    // Open proposal
    const propRes = await app.request(`/organisms/${organism.id}/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposedContentTypeId: 'text',
        proposedPayload: { content: 'v2', format: 'plaintext' },
      }),
    });

    expect(propRes.status).toBe(201);
    const { proposal } = await propRes.json();
    expect(proposal.status).toBe('open');

    // Integrate (test user is the steward)
    const intRes = await app.request(`/proposals/${proposal.id}/integrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(intRes.status).toBe(200);
    const intBody = await intRes.json();
    expect(intBody.proposal.status).toBe('integrated');
    expect(intBody.newState.sequenceNumber).toBe(2);
  });

  it('full proposal lifecycle: open → decline', async () => {
    const createRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentTypeId: 'text',
        payload: { content: 'v1', format: 'plaintext' },
      }),
    });
    const { organism } = await createRes.json();

    const propRes = await app.request(`/organisms/${organism.id}/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposedContentTypeId: 'text',
        proposedPayload: { content: 'v2', format: 'plaintext' },
      }),
    });
    const { proposal } = await propRes.json();

    const decRes = await app.request(`/proposals/${proposal.id}/decline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Not ready yet' }),
    });

    expect(decRes.status).toBe(200);
    const decBody = await decRes.json();
    expect(decBody.proposal.status).toBe('declined');
    expect(decBody.proposal.declineReason).toBe('Not ready yet');
  });

  it('listing proposals for an organism', async () => {
    const createRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentTypeId: 'text',
        payload: { content: 'v1', format: 'plaintext' },
      }),
    });
    const { organism } = await createRes.json();

    // Open two proposals
    await app.request(`/organisms/${organism.id}/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposedContentTypeId: 'text',
        proposedPayload: { content: 'proposal-1', format: 'plaintext' },
      }),
    });
    await app.request(`/organisms/${organism.id}/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposedContentTypeId: 'text',
        proposedPayload: { content: 'proposal-2', format: 'plaintext' },
      }),
    });

    const listRes = await app.request(`/organisms/${organism.id}/proposals`);
    const { proposals } = await listRes.json();
    expect(proposals).toHaveLength(2);
  });
});
