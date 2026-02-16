/**
 * ProposeSection — opens regulated proposals for an organism.
 *
 * Keeps proposal creation separate from proposal integration so the
 * regulated workflow has explicit, focused panel boundaries.
 */

import { useState } from 'react';
import { useOrganism } from '../../../../hooks/use-organism.js';
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
    return (
      <div className="hud-info-section">
        <span className="hud-info-label">Open proposal</span>
        <span className="hud-info-dim">Log in to open proposals.</span>
      </div>
    );
  }

  if (!currentState) {
    return (
      <div className="hud-info-section">
        <span className="hud-info-label">Open proposal</span>
        <span className="hud-info-dim">No current state to propose from.</span>
      </div>
    );
  }

  return (
    <div className="hud-info-section">
      <span className="hud-info-label">Open proposal</span>
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
    </div>
  );
}
