/**
 * Composition — displays what an organism is inside of and what's inside it.
 *
 * Shows parent link, visual child blocks with decompose actions,
 * and compose/create-and-compose controls.
 */

import { useState } from 'react';
import { Link } from 'react-router';
import { composeChild, decomposeChild } from '../api/organisms.js';
import { useChildren, useOrganism, useParent } from '../hooks/use-organism.js';
import { OrganismPicker } from './OrganismPicker.js';
import { ThresholdForm } from './ThresholdForm.js';

function CompositionChild({
  childId,
  onRemove,
  removing,
}: {
  childId: string;
  onRemove: () => void;
  removing: boolean;
}) {
  const { data } = useOrganism(childId);

  const contentType = data?.currentState?.contentTypeId ?? '...';
  const preview = getChildPreview(data?.currentState);

  return (
    <div className="composition-child">
      <Link to={`/organisms/${childId}`} className="composition-child-info">
        <span className="content-type">{contentType}</span>
        <span className="composition-child-preview">{preview}</span>
      </Link>
      <button type="button" className="btn-danger" onClick={onRemove} disabled={removing}>
        {removing ? '...' : 'Remove'}
      </button>
    </div>
  );
}

function getChildPreview(state: { contentTypeId: string; payload: unknown } | undefined): string {
  if (!state) return 'No state';
  const payload = state.payload as Record<string, unknown>;
  if (state.contentTypeId === 'text' && typeof payload?.content === 'string') {
    const text = payload.content;
    return text.length > 50 ? `${text.slice(0, 50)}...` : text || 'Empty';
  }
  if (typeof payload?.name === 'string') return payload.name;
  if (typeof payload?.title === 'string') return payload.title;
  return `${state.contentTypeId} organism`;
}

export function Composition({ organismId }: { organismId: string }) {
  const parent = useParent(organismId);
  const [refreshKey, setRefreshKey] = useState(0);
  const children = useChildren(organismId, refreshKey);
  const [showPicker, setShowPicker] = useState(false);
  const [showThreshold, setShowThreshold] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleDecompose(childId: string) {
    setError('');
    setRemovingId(childId);
    try {
      await decomposeChild(organismId, childId);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decompose');
    } finally {
      setRemovingId(null);
    }
  }

  async function handleCompose(childId: string) {
    setError('');
    setShowPicker(false);
    try {
      await composeChild(organismId, childId);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compose');
    }
  }

  async function handleCreateAndCompose(newOrganismId: string) {
    setShowThreshold(false);
    setError('');
    try {
      await composeChild(organismId, newOrganismId);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compose new organism');
    }
  }

  const childIds = children.data?.map((c) => c.childId) ?? [];
  const excludeIds = [organismId, ...childIds];

  return (
    <section>
      <h3>Composition</h3>

      <h4>Inside of</h4>
      {parent.loading ? (
        <p>Loading...</p>
      ) : parent.data ? (
        <p>
          <Link to={`/organisms/${parent.data.parentId}`}>{parent.data.parentId}</Link>
        </p>
      ) : (
        <p>Root organism</p>
      )}

      <h4>Contains</h4>
      {children.loading ? (
        <p>Loading...</p>
      ) : children.data && children.data.length > 0 ? (
        <div className="composition-children">
          {children.data.map((child) => (
            <CompositionChild
              key={child.childId}
              childId={child.childId}
              onRemove={() => handleDecompose(child.childId)}
              removing={removingId === child.childId}
            />
          ))}
        </div>
      ) : (
        <p>No composed children.</p>
      )}

      {error && <p className="error">{error}</p>}

      <div className="composition-actions">
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setShowPicker(!showPicker);
            setShowThreshold(false);
          }}
        >
          + Compose existing
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setShowThreshold(!showThreshold);
            setShowPicker(false);
          }}
        >
          + Create &amp; compose
        </button>
      </div>

      {showPicker && (
        <OrganismPicker excludeIds={excludeIds} onSelect={handleCompose} onCancel={() => setShowPicker(false)} />
      )}

      {showThreshold && <ThresholdForm onCreated={handleCreateAndCompose} onClose={() => setShowThreshold(false)} />}
    </section>
  );
}
