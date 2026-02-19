/**
 * Public file routes — demo file delivery for media playback.
 *
 * Serves local development assets referenced by fileReference payloads.
 * Access is intentionally constrained to the workspace dev/ directory.
 */

import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';

const WORKSPACE_ROOT = resolve(fileURLToPath(new URL('../../../../', import.meta.url)));
const DEV_ROOT = resolve(WORKSPACE_ROOT, 'dev');

function isInsideDirectory(path: string, root: string): boolean {
  const rel = relative(root, path);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function mimeTypeFor(reference: string): string {
  switch (extname(reference).toLowerCase()) {
    case '.mp3':
      return 'audio/mpeg';
    case '.wav':
      return 'audio/wav';
    case '.flac':
      return 'audio/flac';
    case '.m4a':
      return 'audio/mp4';
    case '.ogg':
      return 'audio/ogg';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    default:
      return 'application/octet-stream';
  }
}

export function publicFileRoutes() {
  const app = new Hono();

  app.get('/*', async (c) => {
    const prefix = '/public/files/';
    const rawPath = c.req.path.startsWith(prefix) ? c.req.path.slice(prefix.length) : '';
    if (!rawPath) {
      return c.json({ error: 'File reference is required' }, 400);
    }

    let fileReference: string;
    try {
      fileReference = decodeURIComponent(rawPath);
    } catch {
      return c.json({ error: 'Invalid file reference encoding' }, 400);
    }

    const normalized = normalize(fileReference).replace(/^(\.\.(\/|\\|$))+/, '');
    if (!normalized.startsWith('dev/')) {
      return c.json({ error: 'File reference must begin with dev/' }, 403);
    }

    const absolutePath = resolve(WORKSPACE_ROOT, normalized);
    if (!isInsideDirectory(absolutePath, DEV_ROOT)) {
      return c.json({ error: 'Forbidden file reference' }, 403);
    }

    try {
      const bytes = await readFile(absolutePath);
      return c.body(bytes, 200, {
        'Content-Type': mimeTypeFor(normalized),
        'Cache-Control': 'public, max-age=300',
      });
    } catch {
      return c.json({ error: 'File not found' }, 404);
    }
  });

  return app;
}
