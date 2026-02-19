/**
 * Interest routes — public email capture for demo-only gated actions.
 *
 * Guests can register interest when they encounter write-only panels.
 * Submissions are always persisted locally and can optionally be forwarded
 * to Substack via SUBSTACK_SUBSCRIBE_URL.
 */

import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import type { Container } from '../container.js';
import { interestSignups } from '../db/schema.js';
import { parseJsonBody } from '../utils/parse-json.js';

const SOURCE_PANEL_IDS = new Set(['profile', 'my-proposals', 'open-proposal', 'append-state']);

interface RegisterInterestRequest {
  email: string;
  sourcePanel: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeForwardError(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 500);
  return 'Unknown forwarding error';
}

async function forwardToSubstack(urlTemplate: string, email: string): Promise<void> {
  const resolved = urlTemplate.includes('{email}')
    ? urlTemplate.replace('{email}', encodeURIComponent(email))
    : urlTemplate;
  const url = new URL(resolved);
  if (!url.searchParams.has('email')) {
    url.searchParams.set('email', email);
  }

  const post = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email }).toString(),
  });

  if (post.ok) return;

  const get = await fetch(url, { method: 'GET' });
  if (get.ok) return;

  throw new Error(`Substack forwarding failed (${post.status}/${get.status})`);
}

export function interestRoutes(container: Container) {
  const app = new Hono();

  app.post('/', async (c) => {
    const body = await parseJsonBody<RegisterInterestRequest>(c);
    if (!body) {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const email = body.email?.trim().toLowerCase();
    if (!email || !isValidEmail(email)) {
      return c.json({ error: 'Valid email is required' }, 400);
    }

    const sourcePanel = SOURCE_PANEL_IDS.has(body.sourcePanel) ? body.sourcePanel : 'profile';
    const substackUrl = process.env.SUBSTACK_SUBSCRIBE_URL?.trim();

    let forwardedAt: Date | null = null;
    let forwardError: string | null = null;

    if (substackUrl) {
      try {
        await forwardToSubstack(substackUrl, email);
        forwardedAt = new Date();
      } catch (error) {
        forwardError = sanitizeForwardError(error);
      }
    }

    await container.db.insert(interestSignups).values({
      id: randomUUID(),
      email,
      sourcePanel,
      forwardedAt,
      forwardError,
    });

    return c.json({ ok: true, forwarded: forwardedAt !== null }, 201);
  });

  return app;
}
