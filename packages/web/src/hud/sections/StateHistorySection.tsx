/**
 * StateHistorySection — displays the state history of an organism.
 *
 * Shows each state's sequence number, content type, and creation date
 * in reverse chronological order.
 */

import { useStateHistory } from '../../hooks/use-organism.js';
import { formatDate } from './format-date.js';

interface StateHistorySectionProps {
  organismId: string;
  refreshKey: number;
}

export function StateHistorySection({ organismId, refreshKey }: StateHistorySectionProps) {
  const { data: states } = useStateHistory(organismId, refreshKey);

  if (!states || states.length === 0) {
    return (
      <div className="hud-info-section">
        <span className="hud-info-label">State history</span>
        <span className="hud-info-dim">No states</span>
      </div>
    );
  }

  const reversed = [...states].reverse();

  return (
    <div className="hud-info-section">
      <span className="hud-info-label">State history</span>
      {reversed.map((s) => (
        <div key={s.id} className="hud-info-state">
          <span className="hud-info-state-num">#{s.sequenceNumber}</span>
          <span className="hud-info-state-detail">
            {s.contentTypeId}, {formatDate(s.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );
}
