/**
 * Authentication middleware — session-based auth for Hono.
 */

import type { UserId } from '@omnilith/kernel';
import { and, eq, gt } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import type { Database } from '../db/connection.js';
import { sessions } from '../db/schema.js';

export type AuthEnv = {
  Variables: {
    userId: UserId;
  };
};

export function authMiddleware(db: Database) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const sessionId = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!sessionId) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const rows = await db
      .select({
        userId: sessions.userId,
      })
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())));

    if (rows.length === 0) {
      return c.json({ error: 'Invalid or expired session' }, 401);
    }

    c.set('userId', rows[0].userId as UserId);
    await next();
  });
}
