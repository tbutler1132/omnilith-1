/**
 * GovernanceSection — displays governance status of an organism.
 *
 * Checks children for policy organisms (integration-policy content type)
 * and shows whether the organism is open or regulated.
 */

import { useChildren, useOrganism } from '../../hooks/use-organism.js';

interface GovernanceSectionProps {
  organismId: string;
}

function GovernanceChildCheck({ childId }: { childId: string }) {
  const { data } = useOrganism(childId);
  if (!data?.currentState) return null;
  if (data.currentState.contentTypeId !== 'integration-policy') return null;

  const payload = data.currentState.payload as Record<string, unknown> | null;
  const detail = payload?.type ? String(payload.type) : 'integration policy';

  return <span className="hud-info-governance-detail">{detail}</span>;
}

function GovernanceResolver({ childIds }: { childIds: string[] }) {
  return (
    <>
      {childIds.map((id) => (
        <GovernanceChildCheck key={id} childId={id} />
      ))}
      <GovernanceFallback childIds={childIds} />
    </>
  );
}

function GovernanceFallback({ childIds }: { childIds: string[] }) {
  if (childIds.length > 0) {
    return null;
  }
  return (
    <>
      <span className="hud-info-governance-status hud-info-governance-open">Open</span>
      <span className="hud-info-governance-detail">No policy organisms</span>
    </>
  );
}

export function GovernanceSection({ organismId }: GovernanceSectionProps) {
  const { data: children } = useChildren(organismId);

  const childIds = (children ?? []).slice(0, 20).map((c) => c.childId);

  if (childIds.length === 0) {
    return (
      <div className="hud-info-section">
        <span className="hud-info-label">Governance</span>
        <span className="hud-info-governance-status hud-info-governance-open">Open</span>
        <span className="hud-info-governance-detail">No policy organisms</span>
      </div>
    );
  }

  return (
    <div className="hud-info-section">
      <span className="hud-info-label">Governance</span>
      <GovernanceResolver childIds={childIds} />
    </div>
  );
}
