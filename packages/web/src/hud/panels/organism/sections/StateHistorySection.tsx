/**
 * StateHistorySection — displays the state history of an organism.
 *
 * Shows each state's sequence number, content type, and creation date
 * in reverse chronological order.
 */

import { useStateHistory } from '../../../../hooks/use-organism.js';
import { PanelInfoEmpty, PanelInfoError, PanelInfoLoading, PanelSection } from '../../core/panel-ux.js';
import { formatDate } from './format-date.js';

interface StateHistorySectionProps {
  organismId: string;
  refreshKey: number;
}

export function StateHistorySection({ organismId, refreshKey }: StateHistorySectionProps) {
  const { data: states, loading, error } = useStateHistory(organismId, refreshKey);

  if (loading) {
    return <PanelInfoLoading label="State history" message="Loading state history..." />;
  }

  if (error) {
    return <PanelInfoError label="State history" message="Failed to load state history." />;
  }

  if (!states || states.length === 0) {
    return <PanelInfoEmpty label="State history" message="No states." />;
  }

  const reversed = [...states].reverse();

  return (
    <PanelSection label="State history">
      {reversed.map((s) => (
        <div key={s.id} className="hud-info-state">
          <span className="hud-info-state-num">#{s.sequenceNumber}</span>
          <span className="hud-info-state-detail">
            {s.contentTypeId}, {formatDate(s.createdAt)}
          </span>
        </div>
      ))}
    </PanelSection>
  );
}
