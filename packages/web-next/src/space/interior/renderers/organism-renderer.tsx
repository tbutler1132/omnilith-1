/**
 * Organism interior renderer switch.
 *
 * Maps content type identifiers to interior renderer components.
 */

import { FallbackOrganismRenderer } from './fallback-organism-renderer.js';
import { TextOrganismRenderer } from './text-organism-renderer.js';

interface OrganismRendererProps {
  readonly contentTypeId: string;
  readonly payload: unknown;
}

export function OrganismRenderer({ contentTypeId, payload }: OrganismRendererProps) {
  if (contentTypeId === 'text') {
    return <TextOrganismRenderer payload={payload} />;
  }

  return <FallbackOrganismRenderer contentTypeId={contentTypeId} payload={payload} />;
}
