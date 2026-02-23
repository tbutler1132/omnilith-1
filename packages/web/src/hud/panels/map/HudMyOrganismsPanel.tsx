/**
 * HudMyOrganismsPanel — map-level cadence index for steward and founder organisms.
 *
 * Lets a user quickly open boundary cadence panels across organisms they tend
 * through stewardship or founder membership relationships.
 */

import { useMemo, useState } from 'react';
import { useChildrenByParentIds, useOrganismMarkersByIds, useUserRelationships } from '../../../hooks/use-organism.js';
import { usePlatformActions, usePlatformStaticState } from '../../../platform/index.js';
import { GuestAccessPrompt } from '../core/GuestAccessPrompt.js';
import { PanelCardErrorWithAction, PanelCardLoading } from '../core/panel-ux.js';
import { presentBoundaryCadenceChildren } from '../organism/sections/boundary-cadence-presenter.js';
import { isCadenceRelevantRelationship, presentMyCadenceOrganisms } from './my-organisms-presenter.js';

const CADENCE_TAB_COUNT = 6;

function formatRoleLabel(role: 'founder' | 'steward'): string {
  if (role === 'founder') {
    return 'Founder';
  }
  return 'Steward';
}

export function HudMyOrganismsPanel() {
  const { canWrite } = usePlatformStaticState();
  const { openInVisor } = usePlatformActions();
  const [refreshKey, setRefreshKey] = useState(0);
  const {
    data: relationships,
    loading: relationshipsLoading,
    error: relationshipsError,
  } = useUserRelationships(refreshKey, canWrite);

  const relevantOrganismIds = useMemo(() => {
    const ids = new Set<string>();
    for (const relationship of relationships ?? []) {
      if (!isCadenceRelevantRelationship(relationship)) {
        continue;
      }
      ids.add(relationship.organismId);
    }
    return [...ids];
  }, [relationships]);

  const {
    data: parentMarkerDataById,
    loading: parentMarkerLoading,
    error: parentMarkerError,
  } = useOrganismMarkersByIds(relevantOrganismIds, refreshKey);
  const {
    data: childrenByParentId,
    loading: childrenLoading,
    error: childrenError,
  } = useChildrenByParentIds(relevantOrganismIds, refreshKey);

  const allChildIds = useMemo(() => {
    const childIds = new Set<string>();
    for (const children of Object.values(childrenByParentId ?? {})) {
      for (const child of children) {
        childIds.add(child.childId);
      }
    }
    return [...childIds];
  }, [childrenByParentId]);

  const {
    data: childMarkerDataById,
    loading: childMarkerLoading,
    error: childMarkerError,
  } = useOrganismMarkersByIds(allChildIds, refreshKey);

  const cadenceChildCountByParentId = useMemo(() => {
    const byParentId = new Map<string, number>();

    for (const parentId of relevantOrganismIds) {
      const childIds = (childrenByParentId?.[parentId] ?? []).map((child) => child.childId);
      byParentId.set(parentId, presentBoundaryCadenceChildren(childIds, childMarkerDataById).length);
    }

    return byParentId;
  }, [childrenByParentId, childMarkerDataById, relevantOrganismIds]);

  const cadenceOrganisms = useMemo(
    () => presentMyCadenceOrganisms(relationships ?? [], parentMarkerDataById, cadenceChildCountByParentId),
    [cadenceChildCountByParentId, parentMarkerDataById, relationships],
  );

  if (!canWrite) {
    return (
      <GuestAccessPrompt
        sourcePanel="profile"
        title="My organisms"
        interestMessage="Cadence tending is invite-only in this demo. Register interest and we will follow up."
        loginMessage="Log in to view organisms you tend."
      />
    );
  }

  const isLoading =
    relationshipsLoading ||
    (relevantOrganismIds.length > 0 && parentMarkerDataById === undefined && parentMarkerLoading) ||
    (relevantOrganismIds.length > 0 && childrenByParentId === undefined && childrenLoading) ||
    (allChildIds.length > 0 && childMarkerDataById === undefined && childMarkerLoading);

  if (isLoading) {
    return <PanelCardLoading title="My organisms" message="Loading cadence organisms..." />;
  }

  if (relationshipsError || childrenError || parentMarkerError || childMarkerError) {
    return (
      <PanelCardErrorWithAction
        title="My organisms"
        message="Could not load cadence organisms."
        actionLabel="Retry"
        onAction={() => setRefreshKey((value) => value + 1)}
      />
    );
  }

  return (
    <div className="hud-my-organisms">
      <header className="hud-my-organisms-header">
        <div>
          <h3>My organisms</h3>
          <p>Steward and founder organisms that already have cadence organisms.</p>
        </div>
        <span className="hud-my-organisms-count">{cadenceOrganisms.length}</span>
      </header>

      {relevantOrganismIds.length === 0 ? (
        <div className="hud-my-organisms-state">
          <p>No steward or founder relationships found yet.</p>
        </div>
      ) : cadenceOrganisms.length === 0 ? (
        <div className="hud-my-organisms-state">
          <p>No tended organisms currently have cadence organisms composed.</p>
        </div>
      ) : (
        <ul className="hud-organism-list">
          {cadenceOrganisms.map((organism) => (
            <li key={organism.organismId}>
              <button
                type="button"
                className="hud-organism-item"
                onClick={() => openInVisor(organism.organismId, 'boundary-cadence')}
              >
                <div className="hud-organism-row">
                  <span className="hud-organism-preview">{organism.name}</span>
                  <span className="hud-cadence-count-chip">
                    {organism.cadenceChildCount}/{CADENCE_TAB_COUNT} cadence
                  </span>
                </div>
                <div className="hud-organism-meta">
                  <span className="hud-organism-type">{organism.contentTypeId ?? 'unknown'}</span>
                  <span className="hud-my-organisms-role-list">
                    {organism.roles.map((role) => (
                      <span key={role} className="hud-my-organisms-role-chip">
                        {formatRoleLabel(role)}
                      </span>
                    ))}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
