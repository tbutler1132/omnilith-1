/**
 * API route tests — verify the HTTP adapter works end-to-end.
 *
 * Uses in-memory adapters from the kernel testing module to avoid
 * database dependencies. Tests the full round trip: HTTP request →
 * route handler → kernel use case → in-memory adapter → response.
 */

import { allContentTypes } from '@omnilith/content-types';
import type {
  ContentTypeRegistry,
  OrganismId,
  OrganismState,
  RelationshipId,
  StateId,
  StateRepository,
  Timestamp,
  UserId,
} from '@omnilith/kernel';
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
  InMemorySurfaceRepository,
  InMemoryVisibilityRepository,
  resetIdCounter,
} from '@omnilith/kernel/src/testing/index.js';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Container } from '../container.js';
import { createNoopGitHubPlugin } from '../github/plugin.js';
import { NoopProposalIntegrationTrigger } from '../github/proposal-integration-trigger.js';
import type { AuthEnv } from '../middleware/auth.js';
import { organismRoutes } from '../routes/organisms.js';
import { proposalRoutes } from '../routes/proposals.js';
import { publicOrganismRoutes } from '../routes/public-organisms.js';
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
  const surfaceRepository = new InMemorySurfaceRepository(stateRepository);

  return {
    organismRepository,
    stateRepository,
    compositionRepository,
    proposalRepository,
    eventPublisher,
    eventRepository: eventPublisher, // dual interface
    visibilityRepository: new InMemoryVisibilityRepository(),
    surfaceRepository,
    relationshipRepository,
    contentTypeRegistry: registry as ContentTypeRegistry,
    identityGenerator: createTestIdentityGenerator(),
    queryPort: new InMemoryQueryPort(
      organismRepository,
      stateRepository,
      proposalRepository,
      compositionRepository,
      eventPublisher,
      relationshipRepository,
    ),
    proposalIntegrationTrigger: new NoopProposalIntegrationTrigger(),
    githubPlugin: createNoopGitHubPlugin(),
    db: null as unknown as Container['db'], // Not used in these tests
  };
}

function createTestApp(container: Container, testUserId: UserId = 'test-user' as UserId) {
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
      if (state.contentTypeId === 'text') {
        const payload = state.payload as Record<string, unknown> | null;
        const metadata = payload?.metadata as Record<string, unknown> | undefined;
        if (metadata?.isPersonalOrganism && !personalOrganismId) {
          personalOrganismId = rel.organismId;
          continue;
        }
        if (metadata?.isHomePage && !homePageOrganismId) {
          homePageOrganismId = rel.organismId;
          continue;
        }
      }

      if (state.contentTypeId === 'spatial-map' && !personalOrganismId) {
        personalOrganismId = rel.organismId;
      }
    }

    return c.json({ userId, personalOrganismId, homePageOrganismId });
  });

  return { app, testUserId };
}

function createPublicReadApp(container: Container) {
  const app = new Hono();
  app.route('/public/organisms', publicOrganismRoutes(container));
  return app;
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

class ConcurrentMapWriteStateRepository implements StateRepository {
  private mapReadCount = 0;
  private hasInjectedConcurrentWrite = false;

  constructor(
    private readonly base: InMemoryStateRepository,
    private readonly mapId: OrganismId,
    private readonly concurrentEntryOrganismId: OrganismId,
  ) {}

  async append(state: OrganismState): Promise<void> {
    await this.base.append(state);
  }

  async findById(id: StateId): Promise<OrganismState | undefined> {
    return this.base.findById(id);
  }

  async findCurrentByOrganismId(organismId: OrganismId): Promise<OrganismState | undefined> {
    if (organismId === this.mapId) {
      this.mapReadCount += 1;
      if (this.mapReadCount === 2 && !this.hasInjectedConcurrentWrite) {
        await this.injectConcurrentWrite();
      }
    }

    return this.base.findCurrentByOrganismId(organismId);
  }

  async findHistoryByOrganismId(organismId: OrganismId): Promise<ReadonlyArray<OrganismState>> {
    return this.base.findHistoryByOrganismId(organismId);
  }

  private async injectConcurrentWrite(): Promise<void> {
    const current = await this.base.findCurrentByOrganismId(this.mapId);
    if (!current || current.contentTypeId !== 'spatial-map') return;

    const payload = current.payload as {
      readonly entries: Array<{
        readonly organismId: string;
        readonly x: number;
        readonly y: number;
        readonly size?: number;
        readonly emphasis?: number;
      }>;
      readonly width: number;
      readonly height: number;
      readonly minSeparation?: number;
    };

    await this.base.append({
      id: `state_concurrent_writer_${current.sequenceNumber + 1}` as StateId,
      organismId: this.mapId,
      contentTypeId: current.contentTypeId,
      payload: {
        entries: [...payload.entries, { organismId: this.concurrentEntryOrganismId, x: 420, y: 420, size: 1.25 }],
        width: payload.width,
        height: payload.height,
        ...(payload.minSeparation !== undefined ? { minSeparation: payload.minSeparation } : {}),
      },
      createdAt: (current.createdAt + 1) as Timestamp,
      createdBy: 'concurrent-user' as UserId,
      sequenceNumber: current.sequenceNumber + 1,
      parentStateId: current.id,
    });

    this.hasInjectedConcurrentWrite = true;
  }
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
    expect(body.organism.openTrunk).toBe(true);
    expect(body.initialState).toBeDefined();
    expect(body.initialState.sequenceNumber).toBe(1);
  });

  it('POST /organisms validates new song-related content types', async () => {
    const songRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Signal Bloom',
        contentTypeId: 'song',
        payload: {
          title: 'Signal Bloom',
          artistCredit: 'Omnilith Ensemble',
          status: 'draft',
        },
      }),
    });
    expect(songRes.status).toBe(201);

    const dawRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Signal Bloom Source',
        contentTypeId: 'daw-project',
        payload: {
          fileReference: 'dev/projects/signal-bloom-v1.als',
          daw: 'ableton-live',
          format: 'als',
        },
      }),
    });
    expect(dawRes.status).toBe(201);

    const stemsRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Signal Bloom Stems',
        contentTypeId: 'stems-bundle',
        payload: {
          fileReference: 'dev/stems/signal-bloom-v1.zip',
          format: 'zip',
          stemCount: 8,
          sampleRate: 48000,
          bitDepth: 24,
        },
      }),
    });
    expect(stemsRes.status).toBe(201);

    const invalidRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Invalid Song',
        contentTypeId: 'song',
        payload: {
          title: '',
          artistCredit: '',
          status: 'shipping',
        },
      }),
    });
    expect(invalidRes.status).toBe(400);
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

  it('PUT /organisms/:id/open-trunk updates regulatory mode for the steward', async () => {
    const created = await createTestOrganism(app, { openTrunk: true });
    const organismId = created.organism.id as string;

    const updateRes = await app.request(`/organisms/${organismId}/open-trunk`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openTrunk: false }),
    });
    expect(updateRes.status).toBe(200);
    const updateBody = await updateRes.json();
    expect(updateBody.organism.openTrunk).toBe(false);

    const appendRes = await app.request(`/organisms/${organismId}/states`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentTypeId: 'text',
        payload: { content: 'v2', format: 'plaintext' },
      }),
    });
    expect(appendRes.status).toBe(403);
  });

  it('POST /organisms/:id/states rejects spatial-map appends in favor of surface route', async () => {
    const createRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Map',
        contentTypeId: 'spatial-map',
        payload: { entries: [], width: 2000, height: 2000 },
        openTrunk: true,
      }),
    });
    const { organism } = await createRes.json();

    const res = await app.request(`/organisms/${organism.id}/states`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentTypeId: 'spatial-map',
        payload: { entries: [], width: 2000, height: 2000 },
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('/organisms/:id/surface');
  });

  it('POST /organisms/:id/surface appends a derived-size map entry', async () => {
    const mapRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Map',
        contentTypeId: 'spatial-map',
        payload: { entries: [], width: 5000, height: 5000 },
        openTrunk: true,
      }),
    });
    const { organism: map } = await mapRes.json();

    const targetRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Field Note',
        contentTypeId: 'text',
        payload: { content: 'hello world', format: 'plaintext' },
      }),
    });
    const { organism: target } = await targetRes.json();

    const surfaceRes = await app.request(`/organisms/${map.id}/surface`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organismId: target.id,
        x: 100,
        y: 120,
      }),
    });

    expect(surfaceRes.status).toBe(201);
    const surfaceBody = await surfaceRes.json();
    expect(surfaceBody.status).toBe('surfaced');
    expect(surfaceBody.entry.organismId).toBe(target.id);
    expect(typeof surfaceBody.entry.size).toBe('number');
    expect(surfaceBody.entry.size).toBeGreaterThan(0);

    const mapStateRes = await app.request(`/organisms/${map.id}`);
    expect(mapStateRes.status).toBe(200);
    const mapBody = await mapStateRes.json();
    const payload = mapBody.currentState.payload as { entries: Array<{ organismId: string; size?: number }> };
    expect(payload.entries).toHaveLength(1);
    expect(payload.entries[0]?.organismId).toBe(target.id);
    expect(typeof payload.entries[0]?.size).toBe('number');
  });

  it('POST /organisms/:id/surface rejects out-of-range curation scale', async () => {
    const mapRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Map',
        contentTypeId: 'spatial-map',
        payload: { entries: [], width: 5000, height: 5000 },
        openTrunk: true,
      }),
    });
    const { organism: map } = await mapRes.json();

    const targetRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Field Note',
        contentTypeId: 'text',
        payload: { content: 'hello world', format: 'plaintext' },
      }),
    });
    const { organism: target } = await targetRes.json();

    const surfaceRes = await app.request(`/organisms/${map.id}/surface`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organismId: target.id,
        x: 100,
        y: 120,
        curationScale: 1.4,
      }),
    });

    expect(surfaceRes.status).toBe(400);
    const body = await surfaceRes.json();
    expect(body.error).toContain('curationScale');
  });

  it('POST /organisms/:id/surface is idempotent for already surfaced organisms', async () => {
    const mapRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Map',
        contentTypeId: 'spatial-map',
        payload: { entries: [], width: 5000, height: 5000 },
        openTrunk: true,
      }),
    });
    const { organism: map } = await mapRes.json();

    const targetRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Target',
        contentTypeId: 'text',
        payload: { content: 'a', format: 'plaintext' },
      }),
    });
    const { organism: target } = await targetRes.json();

    const firstRes = await app.request(`/organisms/${map.id}/surface`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organismId: target.id, x: 200, y: 240 }),
    });
    expect(firstRes.status).toBe(201);

    const secondRes = await app.request(`/organisms/${map.id}/surface`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organismId: target.id, x: 200, y: 240 }),
    });
    expect(secondRes.status).toBe(200);
    const secondBody = await secondRes.json();
    expect(secondBody.status).toBe('already-surfaced');

    const statesRes = await app.request(`/organisms/${map.id}/states`);
    expect(statesRes.status).toBe(200);
    const statesBody = await statesRes.json();
    expect(statesBody.states).toHaveLength(2);
  });

  it('POST /organisms/:id/surface retries with latest map state when a concurrent write lands first', async () => {
    const mapRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Map',
        contentTypeId: 'spatial-map',
        payload: { entries: [], width: 5000, height: 5000 },
        openTrunk: true,
      }),
    });
    const { organism: map } = await mapRes.json();

    const targetRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Target',
        contentTypeId: 'text',
        payload: { content: 'a', format: 'plaintext' },
      }),
    });
    const { organism: target } = await targetRes.json();

    container.stateRepository = new ConcurrentMapWriteStateRepository(
      container.stateRepository as InMemoryStateRepository,
      map.id as OrganismId,
      'org-concurrent-writer' as OrganismId,
    );

    const surfaceRes = await app.request(`/organisms/${map.id}/surface`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organismId: target.id, x: 200, y: 240 }),
    });

    expect(surfaceRes.status).toBe(201);
    const surfaceBody = await surfaceRes.json();
    expect(surfaceBody.status).toBe('surfaced');

    const mapStateRes = await app.request(`/organisms/${map.id}`);
    expect(mapStateRes.status).toBe(200);
    const mapBody = await mapStateRes.json();
    const payload = mapBody.currentState.payload as { entries: Array<{ organismId: string }> };
    expect(payload.entries).toHaveLength(2);
    expect(payload.entries.map((entry) => entry.organismId)).toEqual(
      expect.arrayContaining(['org-concurrent-writer', target.id]),
    );
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

  it('GET /organisms/:id/access returns compose decision for steward', async () => {
    const parentRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Boundary',
        contentTypeId: 'text',
        payload: { content: 'boundary', format: 'plaintext' },
      }),
    });
    const { organism: parent } = await parentRes.json();

    const res = await app.request(`/organisms/${parent.id}/access?action=compose`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.action).toBe('compose');
    expect(body.allowed).toBe(true);
    expect(body.reason).toBeNull();
  });

  it('GET /organisms/:id/access requires organism view access', async () => {
    const parentRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Private Boundary',
        contentTypeId: 'text',
        payload: { content: 'private', format: 'plaintext' },
      }),
    });
    const { organism: parent } = await parentRes.json();

    const outsiderApp = createTestApp(container, 'outsider-user' as UserId).app;
    const deniedRes = await outsiderApp.request(`/organisms/${parent.id}/access?action=compose`);
    expect(deniedRes.status).toBe(403);
  });

  it('GET /organisms/:id/children-with-state returns composed children with organism and current state', async () => {
    const parentRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Boundary',
        contentTypeId: 'text',
        payload: { content: 'boundary', format: 'plaintext' },
      }),
    });
    const { organism: parent } = await parentRes.json();

    const childRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Cadence Variables',
        contentTypeId: 'text',
        payload: { content: '# Variables', format: 'markdown' },
        openTrunk: true,
      }),
    });
    const { organism: child } = await childRes.json();

    const composeRes = await app.request(`/organisms/${parent.id}/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: child.id }),
    });
    expect(composeRes.status).toBe(201);

    const res = await app.request(`/organisms/${parent.id}/children-with-state`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.children).toHaveLength(1);
    expect(body.children[0].composition.parentId).toBe(parent.id);
    expect(body.children[0].composition.childId).toBe(child.id);
    expect(body.children[0].organism.name).toBe('Cadence Variables');
    expect(body.children[0].organism.openTrunk).toBe(true);
    expect(body.children[0].currentState?.contentTypeId).toBe('text');
  });

  it('POST /organisms/:id/observations records an organism.observed event', async () => {
    const sensorRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Activity Sensor',
        contentTypeId: 'sensor',
        payload: {
          label: 'activity-sensor',
          targetOrganismId: 'org-target-placeholder',
          metric: 'state-changes',
          readings: [],
        },
      }),
    });
    const { organism: sensor } = await sensorRes.json();

    const targetRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Target',
        contentTypeId: 'text',
        payload: { content: 'target', format: 'plaintext' },
      }),
    });
    const { organism: target } = await targetRes.json();

    const observeRes = await app.request(`/organisms/${sensor.id}/observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetOrganismId: target.id,
        metric: 'state-changes',
        value: 5,
        sampledAt: Date.now(),
      }),
    });

    expect(observeRes.status).toBe(201);
    const observeBody = await observeRes.json();
    expect(observeBody.event.type).toBe('organism.observed');
    expect(observeBody.event.payload.targetOrganismId).toBe(target.id);

    const eventsRes = await app.request(`/organisms/${sensor.id}/events?type=organism.observed`);
    expect(eventsRes.status).toBe(200);
    const eventsBody = await eventsRes.json();
    expect(eventsBody.events).toHaveLength(1);
  });

  it('POST /organisms/:id/observations denies non-stewards', async () => {
    const stewardSetup = createTestApp(container, 'steward-user' as UserId);
    const stewardApp = stewardSetup.app;

    const sensorRes = await stewardApp.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Activity Sensor',
        contentTypeId: 'sensor',
        payload: {
          label: 'activity-sensor',
          targetOrganismId: 'org-target-placeholder',
          metric: 'state-changes',
          readings: [],
        },
      }),
    });
    const { organism: sensor } = await sensorRes.json();

    const targetRes = await stewardApp.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Target',
        contentTypeId: 'text',
        payload: { content: 'target', format: 'plaintext' },
      }),
    });
    const { organism: target } = await targetRes.json();

    const outsiderSetup = createTestApp(container, 'outsider-user' as UserId);
    const outsiderApp = outsiderSetup.app;
    const observeRes = await outsiderApp.request(`/organisms/${sensor.id}/observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetOrganismId: target.id,
        metric: 'state-changes',
        value: 2,
        sampledAt: Date.now(),
      }),
    });

    expect(observeRes.status).toBe(403);
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
        description: 'Refine wording and tone.',
      }),
    });

    expect(propRes.status).toBe(201);
    const { proposal } = await propRes.json();
    expect(proposal.status).toBe('open');
    expect(proposal.description).toBe('Refine wording and tone.');

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

  it('proposal lifecycle supports mutation intents (compose)', async () => {
    const parentRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Parent',
        contentTypeId: 'text',
        payload: { content: 'parent', format: 'plaintext' },
      }),
    });
    const { organism: parent } = await parentRes.json();

    const childRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Child',
        contentTypeId: 'text',
        payload: { content: 'child', format: 'plaintext' },
      }),
    });
    const { organism: child } = await childRes.json();

    const openRes = await app.request(`/organisms/${parent.id}/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mutation: {
          kind: 'compose',
          childId: child.id,
          position: 1,
        },
      }),
    });
    expect(openRes.status).toBe(201);
    const { proposal } = await openRes.json();

    const integrateRes = await app.request(`/proposals/${proposal.id}/integrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(integrateRes.status).toBe(200);
    const integrated = await integrateRes.json();
    expect(integrated.proposal.status).toBe('integrated');
    expect(integrated.newState).toBeUndefined();

    const childrenRes = await app.request(`/organisms/${parent.id}/children`);
    const { children } = await childrenRes.json();
    expect(children).toHaveLength(1);
    expect(children[0].childId).toBe(child.id);
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

  it('GET /organisms filters by name query', async () => {
    await createTestOrganism(app, { name: 'Alpha Song' });
    await createTestOrganism(app, { name: 'Beta Draft' });
    await createTestOrganism(app, { name: 'alpha Notes' });

    const res = await app.request('/organisms?q=ALPHA');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.organisms).toHaveLength(2);
    expect(body.organisms.map((entry: { organism: { name: string } }) => entry.organism.name)).toEqual([
      'Alpha Song',
      'alpha Notes',
    ]);
  });

  it('GET /organisms applies pagination filters', async () => {
    await createTestOrganism(app, { name: 'First' });
    await createTestOrganism(app, { name: 'Second' });
    await createTestOrganism(app, { name: 'Third' });

    const res = await app.request('/organisms?limit=1&offset=1');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.organisms).toHaveLength(1);
    expect(body.organisms[0].organism.name).toBe('Second');
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

  it('GET /organisms/:id/contributions returns contribution aggregates', async () => {
    const { organism } = await createTestOrganism(app);

    const res = await app.request(`/organisms/${organism.id}/contributions`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.contributions.organismId).toBe(organism.id);
    expect(body.contributions.contributors.length).toBeGreaterThan(0);
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
    // Create personal organism (text with isPersonalOrganism) and home page (text with isHomePage)
    const personalRes = await app.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'My Practice',
        contentTypeId: 'text',
        payload: { content: '', format: 'markdown', metadata: { isPersonalOrganism: true } },
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

describe('authorization enforcement', () => {
  let container: Container;
  let ownerApp: Hono<AuthEnv>;
  let outsiderApp: Hono<AuthEnv>;
  let memberApp: Hono<AuthEnv>;
  let ownerUserId: UserId;
  let outsiderUserId: UserId;
  let memberUserId: UserId;

  beforeEach(() => {
    resetIdCounter();
    container = createTestContainer();
    ownerUserId = 'owner-user' as UserId;
    outsiderUserId = 'outsider-user' as UserId;
    memberUserId = 'member-user' as UserId;
    ownerApp = createTestApp(container, ownerUserId).app;
    outsiderApp = createTestApp(container, outsiderUserId).app;
    memberApp = createTestApp(container, memberUserId).app;
  });

  it('private organism endpoints deny unrelated users', async () => {
    const { organism } = await createTestOrganism(ownerApp);
    await container.visibilityRepository.save({
      organismId: organism.id,
      level: 'private',
      updatedAt: container.identityGenerator.timestamp(),
    });

    const deniedPaths = [
      `/organisms/${organism.id}`,
      `/organisms/${organism.id}/states`,
      `/organisms/${organism.id}/parent`,
      `/organisms/${organism.id}/children`,
      `/organisms/${organism.id}/vitality`,
      `/organisms/${organism.id}/events`,
      `/organisms/${organism.id}/contributions`,
      `/organisms/${organism.id}/relationships`,
      `/organisms/${organism.id}/visibility`,
      `/organisms/${organism.id}/proposals`,
    ];

    for (const path of deniedPaths) {
      const res = await outsiderApp.request(path);
      expect(res.status).toBe(403);
    }
  });

  it('members-only organisms are visible to parent-community members and denied to non-members', async () => {
    const { organism: community } = await createTestOrganism(ownerApp, { name: 'Community' });
    const { organism: child } = await createTestOrganism(ownerApp, { name: 'Child' });
    const mapRes = await ownerApp.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Members Map',
        contentTypeId: 'spatial-map',
        payload: { entries: [], width: 2500, height: 2500 },
        openTrunk: true,
      }),
    });
    expect(mapRes.status).toBe(201);
    const mapBody = await mapRes.json();
    const map = mapBody.organism as { id: string };

    await ownerApp.request(`/organisms/${community.id}/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: child.id }),
    });

    await container.visibilityRepository.save({
      organismId: child.id,
      level: 'members',
      updatedAt: container.identityGenerator.timestamp(),
    });

    await container.relationshipRepository.save({
      id: container.identityGenerator.relationshipId() as RelationshipId,
      type: 'membership',
      userId: memberUserId,
      organismId: community.id,
      role: 'member',
      createdAt: container.identityGenerator.timestamp(),
    });

    const surfaceRes = await ownerApp.request(`/organisms/${map.id}/surface`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organismId: child.id,
        x: 333,
        y: 444,
      }),
    });
    expect(surfaceRes.status).toBe(201);

    const denied = await outsiderApp.request(`/organisms/${child.id}`);
    expect(denied.status).toBe(403);

    const allowed = await memberApp.request(`/organisms/${child.id}`);
    expect(allowed.status).toBe(200);
  });

  it('compose and decompose require permission on parent organism', async () => {
    const { organism: parent } = await createTestOrganism(ownerApp, { name: 'Parent' });
    const { organism: child } = await createTestOrganism(ownerApp, { name: 'Child' });

    const composeDenied = await outsiderApp.request(`/organisms/${parent.id}/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: child.id }),
    });
    expect(composeDenied.status).toBe(403);

    const composeOk = await ownerApp.request(`/organisms/${parent.id}/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: child.id }),
    });
    expect(composeOk.status).toBe(201);

    const decomposeDenied = await outsiderApp.request(`/organisms/${parent.id}/children/${child.id}`, {
      method: 'DELETE',
    });
    expect(decomposeDenied.status).toBe(403);
  });

  it('changing open-trunk mode requires stewardship', async () => {
    const { organism } = await createTestOrganism(ownerApp, { name: 'Draft', openTrunk: true });

    const denied = await outsiderApp.request(`/organisms/${organism.id}/open-trunk`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openTrunk: false }),
    });
    expect(denied.status).toBe(403);

    const allowed = await ownerApp.request(`/organisms/${organism.id}/open-trunk`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openTrunk: false }),
    });
    expect(allowed.status).toBe(200);
  });

  it('opening and listing proposals require organism access', async () => {
    const { organism } = await createTestOrganism(ownerApp, { name: 'Private Draft' });
    await container.visibilityRepository.save({
      organismId: organism.id,
      level: 'private',
      updatedAt: container.identityGenerator.timestamp(),
    });

    const openDenied = await outsiderApp.request(`/organisms/${organism.id}/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposedContentTypeId: 'text',
        proposedPayload: { content: 'unauthorized', format: 'plaintext' },
      }),
    });
    expect(openDenied.status).toBe(403);

    const openOk = await ownerApp.request(`/organisms/${organism.id}/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposedContentTypeId: 'text',
        proposedPayload: { content: 'authorized', format: 'plaintext' },
      }),
    });
    expect(openOk.status).toBe(201);

    const listDenied = await outsiderApp.request(`/organisms/${organism.id}/proposals`);
    expect(listDenied.status).toBe(403);
  });
});

describe('public read routes', () => {
  let container: Container;
  let ownerApp: Hono<AuthEnv>;
  let publicApp: Hono;

  beforeEach(() => {
    resetIdCounter();
    container = createTestContainer();
    ownerApp = createTestApp(container, 'owner-user' as UserId).app;
    publicApp = createPublicReadApp(container);
  });

  it('guest can read a public organism via /public routes', async () => {
    const { organism } = await createTestOrganism(ownerApp);
    const mapRes = await ownerApp.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Public Map',
        contentTypeId: 'spatial-map',
        payload: { entries: [], width: 4000, height: 4000 },
        openTrunk: true,
      }),
    });
    expect(mapRes.status).toBe(201);
    const mapBody = await mapRes.json();
    const map = mapBody.organism as { id: string };

    const surfaceRes = await ownerApp.request(`/organisms/${map.id}/surface`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organismId: organism.id,
        x: 250,
        y: 250,
      }),
    });
    expect(surfaceRes.status).toBe(201);

    const organismRes = await publicApp.request(`/public/organisms/${organism.id}`);
    expect(organismRes.status).toBe(200);

    const statesRes = await publicApp.request(`/public/organisms/${organism.id}/states`);
    expect(statesRes.status).toBe(200);
    const statesBody = await statesRes.json();
    expect(statesBody.states.length).toBe(1);

    const contributionsRes = await publicApp.request(`/public/organisms/${organism.id}/contributions`);
    expect(contributionsRes.status).toBe(200);
  });

  it('guest can batch-read public organisms and private entries are omitted', async () => {
    const { organism: publicOrganism } = await createTestOrganism(ownerApp);
    const { organism: privateOrganism } = await createTestOrganism(ownerApp, {
      name: 'Private Organism',
    });

    await container.visibilityRepository.save({
      organismId: privateOrganism.id,
      level: 'private',
      updatedAt: container.identityGenerator.timestamp(),
    });

    const mapRes = await ownerApp.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Batch Public Map',
        contentTypeId: 'spatial-map',
        payload: { entries: [], width: 4000, height: 4000 },
        openTrunk: true,
      }),
    });
    expect(mapRes.status).toBe(201);
    const mapBody = await mapRes.json();
    const map = mapBody.organism as { id: string };

    const surfaceRes = await ownerApp.request(`/organisms/${map.id}/surface`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organismId: publicOrganism.id,
        x: 300,
        y: 300,
      }),
    });
    expect(surfaceRes.status).toBe(201);

    const batchRes = await publicApp.request(
      `/public/organisms?ids=${publicOrganism.id},${privateOrganism.id},missing-organism`,
    );
    expect(batchRes.status).toBe(200);
    const body = await batchRes.json();
    expect(body.organisms).toHaveLength(1);
    expect(body.organisms[0]?.organism.id).toBe(publicOrganism.id);
  });

  it('guest can read composed children with state via /public routes', async () => {
    const parentRes = await ownerApp.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Public Boundary',
        contentTypeId: 'text',
        payload: { content: 'boundary', format: 'plaintext' },
      }),
    });
    expect(parentRes.status).toBe(201);
    const { organism: parent } = await parentRes.json();

    const childRes = await ownerApp.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Public Cadence Variables',
        contentTypeId: 'text',
        payload: { content: '# Variables', format: 'markdown' },
        openTrunk: true,
      }),
    });
    expect(childRes.status).toBe(201);
    const { organism: child } = await childRes.json();

    const composeRes = await ownerApp.request(`/organisms/${parent.id}/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: child.id }),
    });
    expect(composeRes.status).toBe(201);

    const mapRes = await ownerApp.request('/organisms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Public Map',
        contentTypeId: 'spatial-map',
        payload: { entries: [], width: 4000, height: 4000 },
        openTrunk: true,
      }),
    });
    expect(mapRes.status).toBe(201);
    const mapBody = await mapRes.json();
    const map = mapBody.organism as { id: string };

    const surfaceParentRes = await ownerApp.request(`/organisms/${map.id}/surface`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organismId: parent.id,
        x: 350,
        y: 350,
      }),
    });
    expect(surfaceParentRes.status).toBe(201);

    const surfaceChildRes = await ownerApp.request(`/organisms/${map.id}/surface`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organismId: child.id,
        x: 450,
        y: 450,
      }),
    });
    expect(surfaceChildRes.status).toBe(201);

    const res = await publicApp.request(`/public/organisms/${parent.id}/children-with-state`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.children).toHaveLength(1);
    expect(body.children[0].composition.parentId).toBe(parent.id);
    expect(body.children[0].composition.childId).toBe(child.id);
    expect(body.children[0].organism.name).toBe('Public Cadence Variables');
    expect(body.children[0].currentState?.contentTypeId).toBe('text');
  });

  it('guest receives 404 for non-public organisms via /public routes', async () => {
    const { organism } = await createTestOrganism(ownerApp);
    await container.visibilityRepository.save({
      organismId: organism.id,
      level: 'private',
      updatedAt: container.identityGenerator.timestamp(),
    });

    const res = await publicApp.request(`/public/organisms/${organism.id}`);
    expect(res.status).toBe(404);

    const contributionsRes = await publicApp.request(`/public/organisms/${organism.id}/contributions`);
    expect(contributionsRes.status).toBe(404);
  });

  it('guest receives 404 for unsurfaced organisms even without explicit private visibility', async () => {
    const { organism } = await createTestOrganism(ownerApp);

    const res = await publicApp.request(`/public/organisms/${organism.id}`);
    expect(res.status).toBe(404);
  });
});
