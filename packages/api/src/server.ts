/**
 * Server — Hono application with all routes wired.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Container } from './container.js';
import { type AuthEnv, authMiddleware } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { organismRoutes } from './routes/organisms.js';
import { proposalRoutes } from './routes/proposals.js';
import { userRoutes } from './routes/users.js';

export function createServer(container: Container) {
  const app = new Hono();

  // Global error handler — catch unhandled exceptions, prevent stack trace leaking
  app.onError((err, c) => {
    console.error('Unhandled error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  });

  // Global middleware
  app.use('*', logger());
  app.use('*', cors());

  // Health check
  app.get('/health', (c) => c.json({ status: 'ok' }));

  // Public routes
  app.route('/auth', authRoutes(container));

  // Authenticated routes
  const authenticated = new Hono<AuthEnv>();
  authenticated.use('*', authMiddleware(container.db));
  authenticated.route('/organisms', organismRoutes(container));
  authenticated.route('/users', userRoutes(container));
  authenticated.route('/', proposalRoutes(container));

  // Session info
  authenticated.get('/auth/me', async (c) => {
    const userId = c.get('userId');
    const stewardships = await container.relationshipRepository.findByUser(userId, 'stewardship');
    const personalOrganismId = stewardships.length > 0 ? stewardships[0].organismId : null;
    return c.json({ userId, personalOrganismId });
  });

  app.route('/', authenticated);

  return app;
}
