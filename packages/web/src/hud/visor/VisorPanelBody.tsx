/**
 * VisorPanelBody — renders a universal layer panel by schema ID.
 *
 * Keeps panel content mapping in one place so the panel registry and
 * layout policy can evolve without rewriting host conditionals.
 */

import {
  CompositionSection,
  GovernanceSection,
  ProposalsSection,
  StateHistorySection,
  VitalitySection,
} from '../sections/index.js';
import type { VisorHudPanelId } from './panel-schema.js';

type UniversalVisorHudPanelId = Exclude<VisorHudPanelId, 'organism'>;

interface VisorPanelBodyProps {
  panelId: UniversalVisorHudPanelId;
  organismId: string;
  refreshKey: number;
  canWrite: boolean;
  onMutate: () => void;
}

export function VisorPanelBody({ panelId, organismId, refreshKey, canWrite, onMutate }: VisorPanelBodyProps) {
  if (panelId === 'vitality') {
    return <VitalitySection organismId={organismId} refreshKey={refreshKey} />;
  }
  if (panelId === 'composition') {
    return (
      <CompositionSection organismId={organismId} refreshKey={refreshKey} canWrite={canWrite} onMutate={onMutate} />
    );
  }
  if (panelId === 'proposals') {
    return <ProposalsSection organismId={organismId} refreshKey={refreshKey} canWrite={canWrite} onMutate={onMutate} />;
  }
  if (panelId === 'history') {
    return <StateHistorySection organismId={organismId} refreshKey={refreshKey} />;
  }
  return <GovernanceSection organismId={organismId} />;
}
