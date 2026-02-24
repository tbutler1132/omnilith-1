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
import { PgEventPublisher } from '../adapters/pg-event-publisher.js';
import { PgOrganismRepository } from '../adapters/pg-organism-repository.js';
import { PgRelationshipRepository } from '../adapters/pg-relationship-repository.js';
import { PgStateRepository } from '../adapters/pg-state-repository.js';
import type { Container } from '../container.js';
import { sessions, users } from '../db/schema.js';
import { parseJsonBody } from '../utils/parse-json.js';

export function authRoutes(container: Container) {
  const app = new Hono();

  app.post('/signup', async (c) => {
    const body = await parseJsonBody<{ email: string; password: string }>(c);

    if (!body) {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

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

    const signupResult = await container.db.transaction(async (tx) => {
      const txDb = tx as unknown as Container['db'];
      const txCreateDeps = {
        organismRepository: new PgOrganismRepository(txDb),
        stateRepository: new PgStateRepository(txDb),
        contentTypeRegistry: container.contentTypeRegistry,
        eventPublisher: new PgEventPublisher(txDb),
        relationshipRepository: new PgRelationshipRepository(txDb),
        identityGenerator: container.identityGenerator,
      };

      await tx.insert(users).values({
        id: userId,
        email: body.email,
        passwordHash,
      });

      // Create personal organism (text/markdown — private by default, surfaced intentionally)
      const personalOrganism = await createOrganism(
        {
          name: `${body.email.split('@')[0]}'s Practice`,
          contentTypeId: 'text' as ContentTypeId,
          payload: { content: '', format: 'markdown', metadata: { isPersonalOrganism: true } },
          createdBy: userId,
          openTrunk: true,
        },
        txCreateDeps,
      );

      // Create home page organism (text — the user's landing page)
      const homePage = await createOrganism(
        {
          name: 'Home',
          contentTypeId: 'text' as ContentTypeId,
          payload: { content: '', format: 'markdown', metadata: { isHomePage: true } },
          createdBy: userId,
          openTrunk: true,
        },
        txCreateDeps,
      );

      // Create session
      const sessionId = randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await tx.insert(sessions).values({
        id: sessionId,
        userId,
        expiresAt,
      });

      return {
        sessionId,
        personalOrganismId: personalOrganism.organism.id,
        homePageOrganismId: homePage.organism.id,
      };
    });

    return c.json(
      {
        userId,
        sessionId: signupResult.sessionId,
        personalOrganismId: signupResult.personalOrganismId,
        homePageOrganismId: signupResult.homePageOrganismId,
      },
      201,
    );
  });

  app.post('/login', async (c) => {
    const body = await parseJsonBody<{ email: string; password: string }>(c);
    if (!body) {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

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
