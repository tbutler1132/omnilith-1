import { beforeEach, describe, expect, it } from 'vitest';
import { composeOrganism } from '../composition/compose-organism.js';
import { decomposeOrganism } from '../composition/decompose-organism.js';
import { queryChildren } from '../composition/query-children.js';
import { queryParent } from '../composition/query-parent.js';
import { CompositionError } from '../errors.js';
import { createOrganism } from '../organism/create-organism.js';
import { InMemoryCompositionRepository } from '../testing/in-memory-composition-repository.js';
import { InMemoryContentTypeRegistry } from '../testing/in-memory-content-type-registry.js';
import { InMemoryEventPublisher } from '../testing/in-memory-event-publisher.js';
import { InMemoryOrganismRepository } from '../testing/in-memory-organism-repository.js';
import { InMemoryRelationshipRepository } from '../testing/in-memory-relationship-repository.js';
import { InMemoryStateRepository } from '../testing/in-memory-state-repository.js';
import { InMemoryVisibilityRepository } from '../testing/in-memory-visibility-repository.js';
import {
  createPassthroughContentType,
  createTestIdentityGenerator,
  resetIdCounter,
  testContentTypeId,
  testUserId,
} from '../testing/test-helpers.js';

describe('composition', () => {
  let organismRepository: InMemoryOrganismRepository;
  let stateRepository: InMemoryStateRepository;
  let eventPublisher: InMemoryEventPublisher;
  let relationshipRepository: InMemoryRelationshipRepository;
  let contentTypeRegistry: InMemoryContentTypeRegistry;
  let compositionRepository: InMemoryCompositionRepository;
  let visibilityRepository: InMemoryVisibilityRepository;
  let identityGenerator: ReturnType<typeof createTestIdentityGenerator>;

  beforeEach(() => {
    resetIdCounter();
    organismRepository = new InMemoryOrganismRepository();
    stateRepository = new InMemoryStateRepository();
    eventPublisher = new InMemoryEventPublisher();
    relationshipRepository = new InMemoryRelationshipRepository();
    contentTypeRegistry = new InMemoryContentTypeRegistry();
    compositionRepository = new InMemoryCompositionRepository();
    visibilityRepository = new InMemoryVisibilityRepository();
    identityGenerator = createTestIdentityGenerator();
    contentTypeRegistry.register(createPassthroughContentType());
  });

  const createDeps = () => ({
    organismRepository,
    stateRepository,
    eventPublisher,
    relationshipRepository,
    contentTypeRegistry,
    identityGenerator,
  });

  const composeDeps = () => ({
    organismRepository,
    compositionRepository,
    visibilityRepository,
    relationshipRepository,
    eventPublisher,
    identityGenerator,
  });

  async function makeOrganism(name: string) {
    const userId = testUserId('user');
    return createOrganism(
      {
        name,
        contentTypeId: testContentTypeId(),
        payload: { name },
        createdBy: userId,
      },
      createDeps(),
    );
  }

  it('composing an organism inside another places it within the parent boundary', async () => {
    const { organism: album } = await makeOrganism('Album');
    const { organism: song } = await makeOrganism('Song');
    const userId = testUserId('user');

    await composeOrganism({ parentId: album.id, childId: song.id, composedBy: userId }, composeDeps());

    const children = await queryChildren(album.id, { compositionRepository });
    expect(children).toHaveLength(1);
    expect(children[0].childId).toBe(song.id);
  });

  it('an organism can only have one parent (tree not DAG)', async () => {
    const { organism: album1 } = await makeOrganism('Album 1');
    const { organism: album2 } = await makeOrganism('Album 2');
    const { organism: song } = await makeOrganism('Song');
    const userId = testUserId('user');

    await composeOrganism({ parentId: album1.id, childId: song.id, composedBy: userId }, composeDeps());

    await expect(
      composeOrganism({ parentId: album2.id, childId: song.id, composedBy: userId }, composeDeps()),
    ).rejects.toThrow(CompositionError);
  });

  it('an organism cannot be composed inside itself', async () => {
    const { organism } = await makeOrganism('Self');
    const userId = testUserId('user');

    await expect(
      composeOrganism({ parentId: organism.id, childId: organism.id, composedBy: userId }, composeDeps()),
    ).rejects.toThrow(CompositionError);
  });

  it('decomposing removes the child from the parent', async () => {
    const { organism: album } = await makeOrganism('Album');
    const { organism: song } = await makeOrganism('Song');
    const userId = testUserId('user');

    await composeOrganism({ parentId: album.id, childId: song.id, composedBy: userId }, composeDeps());

    await decomposeOrganism(
      { parentId: album.id, childId: song.id, decomposedBy: userId },
      {
        organismRepository,
        compositionRepository,
        visibilityRepository,
        relationshipRepository,
        eventPublisher,
        identityGenerator,
      },
    );

    const children = await queryChildren(album.id, { compositionRepository });
    expect(children).toHaveLength(0);
  });

  it('decomposing a non-composed organism fails', async () => {
    const { organism: album } = await makeOrganism('Album');
    const { organism: song } = await makeOrganism('Song');
    const userId = testUserId('user');

    await expect(
      decomposeOrganism(
        { parentId: album.id, childId: song.id, decomposedBy: userId },
        {
          organismRepository,
          compositionRepository,
          visibilityRepository,
          relationshipRepository,
          eventPublisher,
          identityGenerator,
        },
      ),
    ).rejects.toThrow(CompositionError);
  });

  it('queryParent returns the parent of a composed organism', async () => {
    const { organism: album } = await makeOrganism('Album');
    const { organism: song } = await makeOrganism('Song');
    const userId = testUserId('user');

    await composeOrganism({ parentId: album.id, childId: song.id, composedBy: userId }, composeDeps());

    const parent = await queryParent(song.id, { compositionRepository });
    expect(parent).toBeDefined();
    expect(parent!.parentId).toBe(album.id);
  });

  it('composing emits an organism.composed event', async () => {
    const { organism: album } = await makeOrganism('Album');
    const { organism: song } = await makeOrganism('Song');
    const userId = testUserId('user');

    eventPublisher.clear();

    await composeOrganism({ parentId: album.id, childId: song.id, composedBy: userId }, composeDeps());

    const events = eventPublisher.findByType('organism.composed');
    expect(events).toHaveLength(1);
    expect(events[0].organismId).toBe(album.id);
    expect(events[0].payload.childId).toBe(song.id);
  });

  it('composing an organism inside its own descendant is rejected (cycle prevention)', async () => {
    const { organism: a } = await makeOrganism('A');
    const { organism: b } = await makeOrganism('B');
    const { organism: c } = await makeOrganism('C');
    const userId = testUserId('user');

    await composeOrganism({ parentId: a.id, childId: b.id, composedBy: userId }, composeDeps());
    await composeOrganism({ parentId: b.id, childId: c.id, composedBy: userId }, composeDeps());

    // Trying to compose A inside C would create A→B→C→A
    await expect(composeOrganism({ parentId: c.id, childId: a.id, composedBy: userId }, composeDeps())).rejects.toThrow(
      CompositionError,
    );
  });

  it('cycle detection works through deep ancestor chains', async () => {
    const { organism: a } = await makeOrganism('A');
    const { organism: b } = await makeOrganism('B');
    const { organism: c } = await makeOrganism('C');
    const { organism: d } = await makeOrganism('D');
    const userId = testUserId('user');

    await composeOrganism({ parentId: a.id, childId: b.id, composedBy: userId }, composeDeps());
    await composeOrganism({ parentId: b.id, childId: c.id, composedBy: userId }, composeDeps());
    await composeOrganism({ parentId: c.id, childId: d.id, composedBy: userId }, composeDeps());

    // Trying to compose A inside D would create A→B→C→D→A
    await expect(composeOrganism({ parentId: d.id, childId: a.id, composedBy: userId }, composeDeps())).rejects.toThrow(
      CompositionError,
    );
  });

  it('decomposing emits an organism.decomposed event', async () => {
    const { organism: album } = await makeOrganism('Album');
    const { organism: song } = await makeOrganism('Song');
    const userId = testUserId('user');

    await composeOrganism({ parentId: album.id, childId: song.id, composedBy: userId }, composeDeps());

    eventPublisher.clear();

    await decomposeOrganism(
      { parentId: album.id, childId: song.id, decomposedBy: userId },
      {
        organismRepository,
        compositionRepository,
        visibilityRepository,
        relationshipRepository,
        eventPublisher,
        identityGenerator,
      },
    );

    const events = eventPublisher.findByType('organism.decomposed');
    expect(events).toHaveLength(1);
  });
});
