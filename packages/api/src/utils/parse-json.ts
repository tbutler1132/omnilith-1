/**
 * parseJsonBody — safely parse a JSON request body.
 *
 * Wraps c.req.json() in a try-catch so malformed JSON returns null
 * instead of throwing. Route handlers use this to return 400 on
 * invalid input rather than letting it bubble as 500.
 */

import type { Context } from 'hono';

export async function parseJsonBody<T>(c: Context): Promise<T | null> {
  try {
    return await c.req.json<T>();
  } catch {
    return null;
  }
}
