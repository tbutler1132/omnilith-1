/**
 * ProposeSection — opens regulated proposals for an organism.
 *
 * Keeps proposal creation separate from proposal integration so the
 * regulated workflow has explicit, focused panel boundaries.
 */

import { useState } from 'react';
import { useOrganism } from '../../../../hooks/use-organism.js';
import { PanelInfoAuthRequired, PanelInfoEmpty, PanelSection } from '../../core/panel-ux.js';
import { ProposeForm } from '../../forms/ProposeForm.js';

interface ProposeSectionProps {
  organismId: string;
  refreshKey: number;
  canWrite: boolean;
  onMutate?: () => void;
}

export function ProposeSection({ organismId, refreshKey: parentRefresh, canWrite, onMutate }: ProposeSectionProps) {
  const [localRefresh, setLocalRefresh] = useState(0);
  const [showForm, setShowForm] = useState(true);
  const combinedRefresh = parentRefresh + localRefresh;
  const { data: organismData } = useOrganism(organismId, combinedRefresh);
  const currentState = organismData?.currentState;

  function handleProposed() {
    setShowForm(false);
    setLocalRefresh((k) => k + 1);
    onMutate?.();
  }

  if (!canWrite) {
    return <PanelInfoAuthRequired label="Open proposal" message="Log in to open proposals." />;
  }

  if (!currentState) {
    return <PanelInfoEmpty label="Open proposal" message="No current state to propose from." />;
  }

  return (
    <PanelSection label="Open proposal">
      {showForm ? (
        <div className="hud-panel-inline-form">
          <ProposeForm
            organismId={organismId}
            currentContentTypeId={currentState.contentTypeId}
            currentPayload={currentState.payload}
            openTrunk={false}
            onComplete={handleProposed}
            onClose={() => setShowForm(false)}
          />
        </div>
      ) : (
        <button type="button" className="hud-action-btn" onClick={() => setShowForm(true)}>
          Open proposal
        </button>
      )}
    </PanelSection>
  );
}
