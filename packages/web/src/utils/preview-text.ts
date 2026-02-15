/**
 * Preview text extraction — derives a short display string from an organism state.
 *
 * Used anywhere a compact representation of an organism is needed:
 * organism pickers, composition children, visor lists.
 */

export function getPreviewText(
  state: { contentTypeId: string; payload: unknown } | undefined | null,
  maxLength = 60,
): string {
  if (!state) return 'No state';

  const payload = state.payload as Record<string, unknown> | null;
  if (!payload || typeof payload !== 'object') return `${state.contentTypeId} organism`;

  if (state.contentTypeId === 'text' && typeof payload.content === 'string') {
    const text = payload.content;
    if (!text) return 'Empty';
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }

  if (typeof payload.name === 'string') return payload.name;
  if (typeof payload.title === 'string') return payload.title;

  return `${state.contentTypeId} organism`;
}
