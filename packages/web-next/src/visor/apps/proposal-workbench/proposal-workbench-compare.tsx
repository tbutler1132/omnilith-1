/**
 * Proposal Workbench compare adapter.
 *
 * Provides a stable compare boundary for proposal review. V1 renders raw JSON,
 * while this adapter seam is reserved for future content-type differ support.
 */

import type { ProposalMutation } from '@omnilith/api-contracts';
import styles from './proposal-workbench-app.module.css';
import { stringifyPayload } from './proposal-workbench-presenter.js';

export interface ProposalWorkbenchCompareProps {
  readonly contentTypeId: string | null;
  readonly mutationKind: ProposalMutation['kind'];
  readonly beforePayload: unknown;
  readonly proposedPayload: unknown;
}

export function ProposalWorkbenchCompare(props: ProposalWorkbenchCompareProps) {
  return renderProposalCompare(props);
}

function renderProposalCompare({
  contentTypeId,
  mutationKind,
  beforePayload,
  proposedPayload,
}: ProposalWorkbenchCompareProps) {
  return (
    <section className={styles.proposalWorkbenchCompare} aria-label="Proposal compare">
      <p className={styles.proposalWorkbenchCompareMeta}>
        Compare mode: raw JSON · mutation {mutationKind} · content type {contentTypeId ?? 'unknown'}
      </p>

      <div className={styles.proposalWorkbenchCompareGrid}>
        <div className={styles.proposalWorkbenchComparePanel}>
          <p className={styles.proposalWorkbenchCompareTitle}>Before</p>
          <pre className={styles.proposalWorkbenchCode}>{stringifyPayload(beforePayload)}</pre>
        </div>
        <div className={styles.proposalWorkbenchComparePanel}>
          <p className={styles.proposalWorkbenchCompareTitle}>Proposed</p>
          <pre className={styles.proposalWorkbenchCode}>{stringifyPayload(proposedPayload)}</pre>
        </div>
      </div>
    </section>
  );
}
