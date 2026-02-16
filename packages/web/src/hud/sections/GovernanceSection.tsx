/**
 * GovernanceSection — displays governance status of an organism.
 *
 * Checks children for policy organisms (integration-policy content type)
 * and shows whether the organism is open or regulated.
 */

import { useChildren, useOrganismsByIds } from '../../hooks/use-organism.js';

interface GovernanceSectionProps {
  organismId: string;
}

export function GovernanceSection({ organismId }: GovernanceSectionProps) {
  const { data: children } = useChildren(organismId);
  const childIds = (children ?? []).slice(0, 12).map((c) => c.childId);
  const { data: childDataById, loading } = useOrganismsByIds(childIds);

  const policyDetails = childIds.flatMap((id) => {
    const state = childDataById?.[id]?.currentState;
    if (!state || state.contentTypeId !== 'integration-policy') return [];

    const payload = state.payload as Record<string, unknown> | null;
    return [payload?.type ? String(payload.type) : 'integration policy'];
  });

  return (
    <div className="hud-info-section">
      <span className="hud-info-label">Governance</span>
      {loading && childIds.length > 0 && <span className="hud-info-dim">Checking policies...</span>}
      {!loading && policyDetails.length > 0 && (
        <>
          <span className="hud-info-governance-status hud-info-governance-regulated">Regulated</span>
          {policyDetails.map((detail, index) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: stable order derived from child composition list
              key={`${detail}-${index}`}
              className="hud-info-governance-detail"
            >
              {detail}
            </span>
          ))}
        </>
      )}
      {!loading && policyDetails.length === 0 && (
        <>
          <span className="hud-info-governance-status hud-info-governance-open">Open</span>
          <span className="hud-info-governance-detail">No policy organisms</span>
        </>
      )}
    </div>
  );
}
