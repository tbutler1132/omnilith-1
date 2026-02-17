/**
 * AppendSection — appends state directly for open-trunk organisms.
 *
 * Open-trunk organisms bypass proposal evaluation, so append-state is
 * surfaced as its own dedicated panel instead of proposal panels.
 */

import { useState } from 'react';
import { useOrganism } from '../../../../hooks/use-organism.js';
import { ProposeForm } from '../../forms/ProposeForm.js';

interface AppendSectionProps {
  organismId: string;
  refreshKey: number;
  canWrite: boolean;
  onMutate?: () => void;
}

export function AppendSection({ organismId, refreshKey: parentRefresh, canWrite, onMutate }: AppendSectionProps) {
  const [localRefresh, setLocalRefresh] = useState(0);
  const [showForm, setShowForm] = useState(true);
  const combinedRefresh = parentRefresh + localRefresh;
  const { data: organismData } = useOrganism(organismId, combinedRefresh);
  const currentState = organismData?.currentState;

  function handleAppended() {
    setShowForm(false);
    setLocalRefresh((k) => k + 1);
    onMutate?.();
  }

  if (!canWrite) {
    return (
      <div className="hud-info-section">
        <span className="hud-info-label">Append state</span>
        <span className="hud-info-dim">Log in to append state.</span>
      </div>
    );
  }

  if (!currentState) {
    return (
      <div className="hud-info-section">
        <span className="hud-info-label">Append state</span>
        <span className="hud-info-dim">No current state to append from.</span>
      </div>
    );
  }

  return (
    <div className="hud-info-section">
      <span className="hud-info-label">Append state</span>
      {showForm ? (
        <div className="hud-panel-inline-form">
          <ProposeForm
            organismId={organismId}
            currentContentTypeId={currentState.contentTypeId}
            currentPayload={currentState.payload}
            openTrunk={true}
            onComplete={handleAppended}
            onClose={() => setShowForm(false)}
          />
        </div>
      ) : (
        <button type="button" className="hud-action-btn" onClick={() => setShowForm(true)}>
          Append state
        </button>
      )}
    </div>
  );
}
