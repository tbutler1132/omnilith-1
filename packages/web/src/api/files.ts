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

export function resolvePublicFileUrl(fileReference: string): string {
  return `/api/public/files/${encodeReferencePath(fileReference)}`;
}
