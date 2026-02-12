/**
 * Vitality — displays an organism's vitality data.
 *
 * Recent state changes, open proposal count, last activity.
 */

import { useVitality } from '../hooks/use-organism.js';

export function Vitality({ organismId }: { organismId: string }) {
  const { data, loading, error } = useVitality(organismId);

  if (loading) return <p>Loading vitality...</p>;
  if (error) return <p>Failed to load vitality.</p>;
  if (!data) return null;

  return (
    <section>
      <h3>Vitality</h3>
      <ul>
        <li>State changes: {data.recentStateChanges}</li>
        <li>Open proposals: {data.openProposalCount}</li>
        <li>Last activity: {data.lastActivityAt ? new Date(data.lastActivityAt).toLocaleDateString() : 'None'}</li>
      </ul>
    </section>
  );
}
