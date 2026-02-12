/**
 * UniversalLayer — the consistent set of affordances shown on every organism.
 *
 * Five sections: vitality, composition, proposals, state history, governance.
 * Available on every organism regardless of content type.
 */

import { Composition } from './Composition.js';
import { Governance } from './Governance.js';
import { Proposals } from './Proposals.js';
import { StateHistory } from './StateHistory.js';
import { Vitality } from './Vitality.js';

export function UniversalLayer({ organismId }: { organismId: string }) {
  return (
    <div className="universal-layer">
      <Vitality organismId={organismId} />
      <Composition organismId={organismId} />
      <Proposals organismId={organismId} />
      <StateHistory organismId={organismId} />
      <Governance organismId={organismId} />
    </div>
  );
}
