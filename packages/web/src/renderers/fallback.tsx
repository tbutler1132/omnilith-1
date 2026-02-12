/**
 * Fallback renderer — generic display for unknown content types.
 *
 * Shows the content type ID and formatted JSON payload.
 */

import type { RendererProps } from './registry.js';

export function FallbackRenderer({ state }: RendererProps) {
  return (
    <div>
      <p>
        <strong>Content type:</strong> {state.contentTypeId}
      </p>
      <pre>{JSON.stringify(state.payload, null, 2)}</pre>
    </div>
  );
}
