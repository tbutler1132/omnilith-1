/**
 * VitalityWidget — compact vitality summary for organism tending context.
 *
 * Surfaces state-change/proposal signal in the widget lane while keeping
 * vitality out of the main panel taxonomy.
 */

import { useVitality } from '../../../hooks/use-organism.js';
import { formatDate } from '../organism/sections/format-date.js';

interface VitalityWidgetProps {
  organismId: string;
  refreshKey: number;
}

export function VitalityWidget({ organismId, refreshKey }: VitalityWidgetProps) {
  const { data: vitality } = useVitality(organismId, refreshKey);

  if (!vitality) return null;

  return (
    <div className="visor-widget vitality-widget">
      <span className="visor-widget-label">Vitality</span>
      <div className="vitality-widget-row">
        <span>State</span>
        <span>{vitality.recentStateChanges}</span>
      </div>
      <div className="vitality-widget-row">
        <span>Open proposals</span>
        <span>{vitality.openProposalCount}</span>
      </div>
      {vitality.lastActivityAt != null && (
        <span className="vitality-widget-meta">{formatDate(vitality.lastActivityAt)}</span>
      )}
    </div>
  );
}
