/**
 * CompositionSection — displays and manages an organism's composition.
 *
 * Shows parent link, children list with decompose action, and compose
 * actions (existing organism or create-and-compose). Child and parent
 * clicks open the target in the Visor.
 */

import { useState } from 'react';
import { composeChild, decomposeChild } from '../../../../api/organisms.js';
import { useChildren, useOrganismsByIds, useParent } from '../../../../hooks/use-organism.js';
import { usePlatformActions } from '../../../../platform/index.js';
import { ThresholdForm } from '../../forms/ThresholdForm.js';
import { OrganismPicker } from './OrganismPicker.js';

interface CompositionSectionProps {
  organismId: string;
  refreshKey: number;
  canWrite: boolean;
  onMutate?: () => void;
}

type ComposeAction = 'compose' | 'create' | null;

export function CompositionSection({
  organismId,
  refreshKey: parentRefresh,
  canWrite,
  onMutate,
}: CompositionSectionProps) {
  const [localRefresh, setLocalRefresh] = useState(0);
  const combinedRefresh = parentRefresh + localRefresh;

  const { data: parent } = useParent(organismId, combinedRefresh);
  const { data: children } = useChildren(organismId, combinedRefresh);
  const { openInVisor } = usePlatformActions();

  const [action, setAction] = useState<ComposeAction>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const childIds = (children ?? []).slice(0, 10).map((c) => c.childId);
  const totalChildren = children?.length ?? 0;
  const { data: childDataById } = useOrganismsByIds(childIds, combinedRefresh);

  function handleParentClick() {
    if (!parent) return;
    openInVisor(parent.parentId);
  }

  async function handleDecompose(childId: string) {
    setRemovingId(childId);
    setError('');
    try {
      await decomposeChild(organismId, childId);
      setLocalRefresh((k) => k + 1);
      onMutate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decompose');
    } finally {
      setRemovingId(null);
    }
  }

  async function handleComposePick(childId: string) {
    setError('');
    try {
      await composeChild(organismId, childId);
      setLocalRefresh((k) => k + 1);
      onMutate?.();
      setAction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compose');
    }
  }

  async function handleCreateAndCompose(newOrganismId: string) {
    setError('');
    try {
      await composeChild(organismId, newOrganismId);
      setLocalRefresh((k) => k + 1);
      onMutate?.();
      setAction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compose');
    }
  }

  return (
    <div className="hud-info-section">
      <span className="hud-info-label">Composition</span>
      {parent ? (
        <div className="hud-info-row">
          <span className="hud-info-row-label">Inside of</span>
          <button type="button" className="hud-info-parent-link" onClick={handleParentClick}>
            {parent.parentId.slice(0, 12)}
          </button>
        </div>
      ) : (
        <span className="hud-info-dim">No parent</span>
      )}
      {childIds.length > 0 && (
        <>
          <span className="hud-info-row-label" style={{ marginTop: 8 }}>
            Contains
          </span>
          {childIds.map((id) => {
            const child = childDataById?.[id];
            return (
              <div key={id} className="hud-info-child-row">
                <button type="button" className="hud-info-child" onClick={() => openInVisor(id)}>
                  <span className="hud-info-child-badge">{child?.currentState?.contentTypeId ?? '...'}</span>
                  <span className="hud-info-child-name">{child?.organism.name ?? '...'}</span>
                </button>
                {canWrite && (
                  <button
                    type="button"
                    className="hud-info-child-remove"
                    onClick={() => handleDecompose(id)}
                    disabled={removingId === id}
                    title="Decompose"
                  >
                    &times;
                  </button>
                )}
              </div>
            );
          })}
          {totalChildren > 10 && <span className="hud-info-dim">+{totalChildren - 10} more</span>}
        </>
      )}
      {childIds.length === 0 && !parent && <span className="hud-info-dim">No children</span>}

      {/* Compose actions */}
      {canWrite && action === null && (
        <div className="hud-compose-actions">
          <button type="button" className="hud-compose-btn" onClick={() => setAction('compose')}>
            + Compose existing
          </button>
          <button type="button" className="hud-compose-btn" onClick={() => setAction('create')}>
            + Create &amp; compose
          </button>
        </div>
      )}

      {canWrite && action === 'compose' && (
        <OrganismPicker
          excludeIds={[organismId, ...childIds]}
          onSelect={handleComposePick}
          onCancel={() => setAction(null)}
        />
      )}

      {canWrite && action === 'create' && (
        <ThresholdForm inline onCreated={handleCreateAndCompose} onClose={() => setAction(null)} />
      )}
      {!canWrite && <span className="hud-info-dim">Log in to compose or decompose.</span>}

      {error && <span className="hud-info-error">{error}</span>}
    </div>
  );
}
