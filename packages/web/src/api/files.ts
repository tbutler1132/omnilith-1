/**
 * File URL helpers — resolves media fileReference values to public URLs.
 */

function encodeReferencePath(fileReference: string): string {
  return fileReference
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function isPublicHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function resolvePublicFileUrl(fileReference: string): string {
  if (isPublicHttpUrl(fileReference)) {
    return fileReference;
  }
  return `/api/public/files/${encodeReferencePath(fileReference)}`;
}
