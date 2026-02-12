/**
 * Auth routes — signup, login, logout.
 *
 * When a user signs up, the system creates a personal organism
 * with a stewardship relationship.
 */

import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { ContentTypeId, UserId } from '@omnilith/kernel';
import { createOrganism } from '@omnilith/kernel';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type { Container } from '../container.js';
import { sessions, users } from '../db/schema.js';

export function authRoutes(container: Container) {
  const app = new Hono();

  app.post('/signup', async (c) => {
    const body = await c.req.json<{ email: string; password: string }>();

    if (!body.email || !body.password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Check for existing user
    const existing = await container.db.select().from(users).where(eq(users.email, body.email));
    if (existing.length > 0) {
      return c.json({ error: 'Email already registered' }, 409);
    }

    const userId = randomUUID() as UserId;
    const passwordHash = hashPassword(body.password);

    await container.db.insert(users).values({
      id: userId,
      email: body.email,
      passwordHash,
    });

    const createDeps = {
      organismRepository: container.organismRepository,
      stateRepository: container.stateRepository,
      contentTypeRegistry: container.contentTypeRegistry,
      eventPublisher: container.eventPublisher,
      relationshipRepository: container.relationshipRepository,
      identityGenerator: container.identityGenerator,
    };

    // Create personal organism (spatial-map — the user's space)
    const personalOrganism = await createOrganism(
      {
        contentTypeId: 'spatial-map' as ContentTypeId,
        payload: { entries: [], width: 2000, height: 2000 },
        createdBy: userId,
        openTrunk: true,
      },
      createDeps,
    );

    // Create home page organism (text — the user's landing page)
    const homePage = await createOrganism(
      {
        contentTypeId: 'text' as ContentTypeId,
        payload: { content: '', format: 'markdown', metadata: { isHomePage: true } },
        createdBy: userId,
        openTrunk: true,
      },
      createDeps,
    );

    // Create session
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await container.db.insert(sessions).values({
      id: sessionId,
      userId,
      expiresAt,
    });

    return c.json(
      {
        userId,
        sessionId,
        personalOrganismId: personalOrganism.organism.id,
        homePageOrganismId: homePage.organism.id,
      },
      201,
    );
  });

  app.post('/login', async (c) => {
    const body = await c.req.json<{ email: string; password: string }>();

    const rows = await container.db.select().from(users).where(eq(users.email, body.email));
    if (rows.length === 0) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const user = rows[0];
    if (!verifyPassword(body.password, user.passwordHash)) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await container.db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      expiresAt,
    });

    return c.json({ userId: user.id, sessionId });
  });

  app.post('/logout', async (c) => {
    const sessionId = c.req.header('Authorization')?.replace('Bearer ', '');
    if (sessionId) {
      await container.db.delete(sessions).where(eq(sessions.id, sessionId));
    }
    return c.json({ ok: true });
  });

  return app;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const hashBuffer = Buffer.from(hash, 'hex');
  const derived = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, derived);
}
