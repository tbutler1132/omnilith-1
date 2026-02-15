/**
 * API route tests — verify the HTTP adapter works end-to-end.
 *
 * Uses in-memory adapters from the kernel testing module to avoid
 * database dependencies. Tests the full round trip: HTTP request →
 * route handler → kernel use case → in-memory adapter → response.
 */

import { allContentTypes } from '@omnilith/content-types';
import type { ContentTypeRegistry, UserId } from '@omnilith/kernel';
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
import { proposalRoutes } from '../routes/proposals.js';
import { userRoutes } from '../routes/users.js';

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
    eventRepository: eventPublisher, // dual interface
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
    db: null as unknown as Container['db'], // Not used in these tests
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
  app.route('/users', userRoutes(container));
  app.route('/', proposalRoutes(container));

  // Session info
  app.get('/auth/me', async (c) => {
    const userId = c.get('userId');
    const stewardships = await container.relationshipRepository.findByUser(userId, 'stewardship');

    let personalOrganismId: string | null = null;
    let homePageOrganismId: string | null = null;

    for (const rel of stewardships) {
      const state = await container.stateRepository.findCurrentByOrganismId(rel.organismId);
      if (!state) continue;
      if (state.contentTypeId === 'spatial-map' && !personalOrganismId) {
        personalOrganismId = rel.organismId;
      } else if (state.contentTypeId === 'text' && !homePageOrganismId) {
        const payload = state.payload as Record<string, unknown> | null;
        if ((payload?.metadata as Record<string, unknown> | undefined)?.isHomePage) {
          homePageOrganismId = rel.organismId;
        }
      }
    }

    return c.json({ userId, personalOrganismId, homePageOrganismId });
  });

  return { app, testUserId };
}

async function createTestOrganism(app: Hono<AuthEnv>, options?: { openTrunk?: boolean; name?: string }) {
  const res = await app.request('/organisms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: options?.name ?? 'Test Organism',
      contentTypeId: 'text',
      payload: { content: 'test', format: 'plaintext' },
      openTrunk: options?.openTrunk,
    }),
  });
  const body = await res.json();
  return body;
}

describe('organism routes', () => {
  let container: Container;
  let app: Hono<AuthEnv>;

  beforeEach(() => {
    resetIdCounter();
    container = createTestContainer();
    const setup = createTestApp(container);
    app = setup.app;
  });

  it('POST /organisms creates an organism (threshold)', async () => {
    const res = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hello World',
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
        name: 'Test',
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
        name: 'Open Trunk Test',
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
        name: 'Closed Trunk Test',
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
        name: 'Album',
        contentTypeId: 'text',
        payload: { content: 'album', format: 'plaintext' },
      }),
    });
    const { organism: parent } = await parentRes.json();

    const childRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Song',
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

  beforeEach(() => {
    resetIdCounter();
    container = createTestContainer();
    const setup = createTestApp(container);
    app = setup.app;
  });

  it('full proposal lifecycle: open → integrate', async () => {
    // Create organism
    const createRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test',
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
        name: 'Test',
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
        name: 'Test',
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

describe('error handling', () => {
  let container: Container;
  let app: Hono<AuthEnv>;

  beforeEach(() => {
    resetIdCounter();
    container = createTestContainer();
    const setup = createTestApp(container);
    app = setup.app;
  });

  it('malformed JSON body on organism creation returns 400', async () => {
    const res = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ not valid json',
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid JSON body');
  });

  it('malformed JSON body on proposal creation returns 400', async () => {
    // Create a valid organism first
    const createRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test',
        contentTypeId: 'text',
        payload: { content: 'test', format: 'plaintext' },
      }),
    });
    const { organism } = await createRes.json();

    const res = await app.request(`/organisms/${organism.id}/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ broken json!!!',
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid JSON body');
  });
});

describe('query and listing routes', () => {
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

  it('GET /organisms lists organisms', async () => {
    await createTestOrganism(app);
    await createTestOrganism(app);

    const res = await app.request('/organisms');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.organisms).toHaveLength(2);
  });

  it('GET /organisms/:id/parent returns parent composition record', async () => {
    const { organism: parent } = await createTestOrganism(app);
    const { organism: child } = await createTestOrganism(app);

    await app.request(`/organisms/${parent.id}/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: child.id }),
    });

    const res = await app.request(`/organisms/${child.id}/parent`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.parent).not.toBeNull();
    expect(body.parent.parentId).toBe(parent.id);
  });

  it('GET /organisms/:id/parent returns null when no parent exists', async () => {
    const { organism } = await createTestOrganism(app);

    const res = await app.request(`/organisms/${organism.id}/parent`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.parent).toBeNull();
  });

  it('GET /organisms/:id/vitality returns vitality data', async () => {
    const { organism } = await createTestOrganism(app);

    const res = await app.request(`/organisms/${organism.id}/vitality`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.vitality.organismId).toBe(organism.id);
    expect(body.vitality.recentStateChanges).toBe(1);
    expect(body.vitality.openProposalCount).toBe(0);
  });

  it('GET /organisms/:id/events returns events for an organism', async () => {
    const { organism } = await createTestOrganism(app);

    const res = await app.request(`/organisms/${organism.id}/events`);
    expect(res.status).toBe(200);
    const body = await res.json();
    // Creating an organism emits events
    expect(body.events.length).toBeGreaterThan(0);
    expect(body.events[0].organismId).toBe(organism.id);
  });

  it('GET /organisms/:id/relationships returns relationships for an organism', async () => {
    const { organism } = await createTestOrganism(app);

    const res = await app.request(`/organisms/${organism.id}/relationships`);
    expect(res.status).toBe(200);
    const body = await res.json();
    // Creating an organism creates a stewardship relationship
    expect(body.relationships.length).toBeGreaterThan(0);
    expect(body.relationships[0].type).toBe('stewardship');
  });

  it('GET /users/me/organisms returns organisms for the current user', async () => {
    await createTestOrganism(app);
    await createTestOrganism(app);

    const res = await app.request('/users/me/organisms');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.organisms).toHaveLength(2);
  });

  it('GET /auth/me returns current user session info with personal and home page organisms', async () => {
    // Create personal organism (spatial-map) and home page (text with isHomePage)
    const personalRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'My Space',
        contentTypeId: 'spatial-map',
        payload: { entries: [], width: 2000, height: 2000 },
      }),
    });
    const { organism: personal } = await personalRes.json();

    const homeRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Home',
        contentTypeId: 'text',
        payload: { content: '', format: 'markdown', metadata: { isHomePage: true } },
      }),
    });
    const { organism: home } = await homeRes.json();

    const res = await app.request('/auth/me');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe(testUserId);
    expect(body.personalOrganismId).toBe(personal.id);
    expect(body.homePageOrganismId).toBe(home.id);
  });

  it('GET /users/me/proposals returns proposals authored by the current user', async () => {
    // Create an organism and open a proposal on it
    const { organism } = await createTestOrganism(app);

    await app.request(`/organisms/${organism.id}/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposedContentTypeId: 'text',
        proposedPayload: { content: 'v2', format: 'plaintext' },
      }),
    });

    const res = await app.request('/users/me/proposals');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.proposals).toHaveLength(1);
    expect(body.proposals[0].proposedBy).toBe(testUserId);
  });
});
