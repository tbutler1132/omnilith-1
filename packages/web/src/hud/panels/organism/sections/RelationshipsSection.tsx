/**
 * RelationshipsSection — read-only relationship visibility for an organism.
 *
 * Shows the connective tissue between users and the current organism so
 * stewardship and integration authority remain legible while tending.
 */

import { useRelationships } from '../../../../hooks/use-organism.js';
import { presentRelationships } from './relationships-presenter.js';

interface RelationshipsSectionProps {
  organismId: string;
}

export function RelationshipsSection({ organismId }: RelationshipsSectionProps) {
  const { data, loading, error } = useRelationships(organismId);
  const rows = presentRelationships(data ?? []);

  return (
    <div className="hud-info-section">
      <span className="hud-info-label">Relationships</span>
      {loading && <span className="hud-info-dim">Loading relationships...</span>}
      {error && !loading && <span className="hud-info-error">Failed to load relationships.</span>}
      {!loading && !error && rows.length === 0 && (
        <span className="hud-info-dim">No relationships visible for this organism.</span>
      )}
      {!loading && !error && rows.length > 0 && (
        <div className="hud-info-relationship-list">
          {rows.map((row) => (
            <div key={row.id} className="hud-info-relationship">
              <div className="hud-info-row">
                <span className="hud-info-row-label">
                  {row.typeLabel}
                  {row.roleLabel ? ` (${row.roleLabel})` : ''}
                </span>
                <span className="hud-info-row-value">{row.userLabel}</span>
              </div>
              <span className="hud-info-dim">{row.createdAtLabel}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
