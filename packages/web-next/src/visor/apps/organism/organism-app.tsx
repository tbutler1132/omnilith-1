/**
 * Organism app.
 *
 * First real app slice for open visor mode, showing a simple organism
 * overview with deterministic presenter logic and raw payload output.
 */

import type { VisorAppRenderProps } from '../app-contract.js';
import { presentOrganismOverview } from './organism-overview-presenter.js';
import { OrganismWireframePreview } from './organism-wireframe-preview.js';
import { useOrganismOverview } from './use-organism-overview.js';

export function OrganismApp({ onRequestClose, organismId }: VisorAppRenderProps) {
  void onRequestClose;

  const { data, loading, error } = useOrganismOverview(organismId);
  const contentTypeId = data?.currentState?.contentTypeId ?? null;
  const presented = presentOrganismOverview({
    organismLoading: loading,
    organismError: error ?? undefined,
    hasCurrentState: Boolean(data?.currentState),
    payload: data?.currentState?.payload,
  });

  return (
    <section className="organism-app">
      <h2 className="organism-app-title">Organism</h2>

      {data ? (
        <dl className="organism-overview-meta">
          <div className="organism-overview-meta-row">
            <dt>ID</dt>
            <dd>{data.organism.id}</dd>
          </div>
          <div className="organism-overview-meta-row">
            <dt>Name</dt>
            <dd>{data.organism.name}</dd>
          </div>
          <div className="organism-overview-meta-row">
            <dt>Content Type</dt>
            <dd>{data.currentState?.contentTypeId ?? 'none'}</dd>
          </div>
        </dl>
      ) : null}

      {presented.status !== 'ready' ? <p className="organism-overview-status">{presented.message}</p> : null}

      {presented.status === 'ready' ? (
        <>
          <OrganismWireframePreview contentTypeId={contentTypeId} />
          <pre className="organism-overview-payload">{presented.rawPayload}</pre>
        </>
      ) : null}
    </section>
  );
}
