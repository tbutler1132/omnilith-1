/**
 * CompositionSection — displays and manages an organism's composition.
 *
 * Shows parent link, children list with decompose action, and compose
 * actions (existing organism or create-and-compose). Child and parent
 * clicks open the target in the Visor.
 */

import { useState } from 'react';
import { composeChild, decomposeChild } from '../../api/organisms.js';
import { useChildren, useOrganism, useParent } from '../../hooks/use-organism.js';
import { OrganismPicker } from '../../organisms/OrganismPicker.js';
import { ThresholdForm } from '../../organisms/ThresholdForm.js';
import { usePlatform } from '../../platform/PlatformContext.js';

interface CompositionSectionProps {
  organismId: string;
  refreshKey: number;
}

type ComposeAction = 'compose' | 'create' | null;

function ChildItem({
  childId,
  onRemove,
  removing,
}: {
  childId: string;
  onRemove: (childId: string) => void;
  removing: boolean;
}) {
  const { data } = useOrganism(childId);
  const { openInVisor } = usePlatform();

  const contentType = data?.currentState?.contentTypeId ?? '...';

  function handleClick() {
    openInVisor(childId);
  }

  return (
    <div className="hud-info-child-row">
      <button type="button" className="hud-info-child" onClick={handleClick}>
        <span className="hud-info-child-badge">{contentType}</span>
        <span className="hud-info-child-name">{data?.organism.name ?? '...'}</span>
      </button>
      <button
        type="button"
        className="hud-info-child-remove"
        onClick={() => onRemove(childId)}
        disabled={removing}
        title="Decompose"
      >
        &times;
      </button>
    </div>
  );
}

export function CompositionSection({ organismId, refreshKey: parentRefresh }: CompositionSectionProps) {
  const [localRefresh, setLocalRefresh] = useState(0);
  const combinedRefresh = parentRefresh + localRefresh;

  const { data: parent } = useParent(organismId, combinedRefresh);
  const { data: children } = useChildren(organismId, combinedRefresh);
  const { openInVisor } = usePlatform();

  const [action, setAction] = useState<ComposeAction>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const childIds = (children ?? []).slice(0, 10).map((c) => c.childId);
  const totalChildren = children?.length ?? 0;

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
          {childIds.map((id) => (
            <ChildItem key={id} childId={id} onRemove={handleDecompose} removing={removingId === id} />
          ))}
          {totalChildren > 10 && <span className="hud-info-dim">+{totalChildren - 10} more</span>}
        </>
      )}
      {childIds.length === 0 && !parent && <span className="hud-info-dim">No children</span>}

      {/* Compose actions */}
      {action === null && (
        <div className="hud-compose-actions">
          <button type="button" className="hud-compose-btn" onClick={() => setAction('compose')}>
            + Compose existing
          </button>
          <button type="button" className="hud-compose-btn" onClick={() => setAction('create')}>
            + Create &amp; compose
          </button>
        </div>
      )}

      {action === 'compose' && (
        <OrganismPicker
          excludeIds={[organismId, ...childIds]}
          onSelect={handleComposePick}
          onCancel={() => setAction(null)}
        />
      )}

      {action === 'create' && (
        <ThresholdForm inline onCreated={handleCreateAndCompose} onClose={() => setAction(null)} />
      )}

      {error && <span className="hud-info-error">{error}</span>}
    </div>
  );
}
