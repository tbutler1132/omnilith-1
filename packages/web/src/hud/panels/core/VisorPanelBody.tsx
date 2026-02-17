/**
 * VisorPanelBody — renders a universal layer panel by schema ID.
 *
 * Keeps panel content mapping in one place so the panel registry and
 * layout policy can evolve without rewriting host conditionals.
 */

import { renderUniversalVisorPanelBody } from './panel-body-registry.js';
import type { UniversalVisorHudPanelId } from './panel-schema.js';

interface VisorPanelBodyProps {
  panelId: UniversalVisorHudPanelId;
  organismId: string;
  refreshKey: number;
  canWrite: boolean;
  onMutate: () => void;
}

export function VisorPanelBody({ panelId, organismId, refreshKey, canWrite, onMutate }: VisorPanelBodyProps) {
  return renderUniversalVisorPanelBody(panelId, {
    organismId,
    refreshKey,
    canWrite,
    onMutate,
  });
}
