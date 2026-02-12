/**
 * User routes — user-scoped queries.
 */

import { Hono } from 'hono';
import type { Container } from '../container.js';
import type { AuthEnv } from '../middleware/auth.js';

export function userRoutes(container: Container) {
  const app = new Hono<AuthEnv>();

  // Current user's organisms
  app.get('/me/organisms', async (c) => {
    const userId = c.get('userId');
    const organisms = await container.queryPort.findOrganismsByUser(userId);
    return c.json({ organisms });
  });

  // Current user's relationships
  app.get('/me/relationships', async (c) => {
    const userId = c.get('userId');
    const type = c.req.query('type') as any;
    const relationships = await container.relationshipRepository.findByUser(userId, type || undefined);
    return c.json({ relationships });
  });

  return app;
}
