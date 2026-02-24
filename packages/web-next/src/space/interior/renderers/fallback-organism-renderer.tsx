/**
 * Fallback organism renderer.
 *
 * Keeps unknown content types inspectable while web-next renderer
 * coverage is still being rebuilt.
 */

export function FallbackOrganismRenderer({ contentTypeId, payload }: { contentTypeId: string; payload: unknown }) {
  return (
    <div className="space-interior-fallback">
      <p className="space-interior-fallback-label">Renderer pending for: {contentTypeId}</p>
      <pre>{JSON.stringify(payload, null, 2)}</pre>
    </div>
  );
}
