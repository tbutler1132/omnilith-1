/**
 * Marker preview renderer.
 *
 * Provides compact close-altitude organism previews directly on the map.
 */

interface MarkerPreviewProps {
  readonly contentTypeId: string | null;
  readonly payload: unknown;
}

function toTextSnippet(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const typed = payload as Record<string, unknown>;
  const content = typeof typed.content === 'string' ? typed.content : '';
  if (!content) {
    return '';
  }

  const normalized = content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!normalized) {
    return '';
  }

  return normalized.length > 150 ? `${normalized.slice(0, 147)}...` : normalized;
}

function toDescriptionSnippet(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const typed = payload as Record<string, unknown>;
  const description = typeof typed.description === 'string' ? typed.description.trim() : '';
  if (!description) {
    return '';
  }

  return description.length > 150 ? `${description.slice(0, 147)}...` : description;
}

export function MarkerPreview({ contentTypeId, payload }: MarkerPreviewProps) {
  if (contentTypeId === 'text') {
    const snippet = toTextSnippet(payload);
    return <p className="space-marker-preview-text">{snippet || 'Text organism'}</p>;
  }

  if (contentTypeId === 'community') {
    const snippet = toDescriptionSnippet(payload);
    return <p className="space-marker-preview-text">{snippet || 'Community boundary'}</p>;
  }

  if (contentTypeId === 'spatial-map') {
    return <p className="space-marker-preview-text">Spatial map boundary</p>;
  }

  return <p className="space-marker-preview-text">No preview yet</p>;
}
