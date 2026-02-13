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
import { templateRoutes } from './routes/templates.js';
import { userRoutes } from './routes/users.js';

export interface ServerConfig {
  worldMapId?: string;
}

export function createServer(container: Container, config?: ServerConfig) {
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

  // Platform info (public)
  app.get('/platform/world-map', (c) => {
    const worldMapId = config?.worldMapId ?? null;
    return c.json({ worldMapId });
  });

  // Authenticated routes
  const authenticated = new Hono<AuthEnv>();
  authenticated.use('*', authMiddleware(container.db));
  authenticated.route('/organisms', organismRoutes(container));
  authenticated.route('/users', userRoutes(container));
  authenticated.route('/templates', templateRoutes(container));
  authenticated.route('/', proposalRoutes(container));

  // Session info
  authenticated.get('/auth/me', async (c) => {
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

  app.route('/', authenticated);

  return app;
}
