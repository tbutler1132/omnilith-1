/**
 * Server — Hono application with all routes wired.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Container } from './container.js';
import { authMiddleware, type AuthEnv } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { organismRoutes } from './routes/organisms.js';
import { proposalRoutes } from './routes/proposals.js';

export function createServer(container: Container) {
  const app = new Hono();

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
  authenticated.route('/', proposalRoutes(container));

  app.route('/', authenticated);

  return app;
}
