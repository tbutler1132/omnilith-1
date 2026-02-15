/**
 * VitalitySection — displays vitality indicators for an organism.
 *
 * Shows recent state changes, open proposal count, and last activity date.
 */

import { useVitality } from '../../hooks/use-organism.js';
import { formatDate } from './format-date.js';

interface VitalitySectionProps {
  organismId: string;
  refreshKey: number;
}

export function VitalitySection({ organismId, refreshKey }: VitalitySectionProps) {
  const { data: vitality } = useVitality(organismId, refreshKey);

  if (!vitality) return null;

  return (
    <div className="hud-info-section">
      <span className="hud-info-label">Vitality</span>
      <div className="hud-info-row">
        <span className="hud-info-row-label">State changes</span>
        <span className="hud-info-row-value">{vitality.recentStateChanges}</span>
      </div>
      <div className="hud-info-row">
        <span className="hud-info-row-label">Open proposals</span>
        <span className="hud-info-row-value">{vitality.openProposalCount}</span>
      </div>
      {vitality.lastActivityAt != null && (
        <div className="hud-info-row">
          <span className="hud-info-row-label">Last activity</span>
          <span className="hud-info-row-value">{formatDate(vitality.lastActivityAt)}</span>
        </div>
      )}
    </div>
  );
}
