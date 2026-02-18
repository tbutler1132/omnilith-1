/**
 * Song renderer — curated song experience assembled from composed children.
 *
 * The parent song state carries core identity; production assets and
 * listening variants are composed as child organisms inside the boundary.
 */

import { resolvePublicFileUrl } from '../api/files.js';
import { useChildren, useOrganismsByIds } from '../hooks/use-organism.js';
import type { RendererProps } from './registry.js';

interface SongPayload {
  title?: string;
  artistCredit?: string;
  status?: string;
  tempoBpm?: number;
  keySignature?: string;
  notes?: string;
}

interface ChildSummary {
  id: string;
  name: string;
  contentTypeId: string;
  fileReference?: string;
}

function sectionLabel(contentTypeId: string) {
  switch (contentTypeId) {
    case 'image':
      return 'Cover Art';
    case 'audio':
      return 'Mixes & Masters';
    case 'daw-project':
      return 'Source Project';
    case 'stems-bundle':
      return 'Stems';
    default:
      return contentTypeId;
  }
}

function sectionOrder(contentTypeId: string) {
  switch (contentTypeId) {
    case 'image':
      return 0;
    case 'audio':
      return 1;
    case 'daw-project':
      return 2;
    case 'stems-bundle':
      return 3;
    default:
      return 99;
  }
}

export function SongRenderer({ state, zoom: _zoom, focused: _focused }: RendererProps) {
  const payload = state.payload as SongPayload;
  const { data: children, loading } = useChildren(state.organismId);
  const childIds = children?.map((child) => child.childId) ?? [];
  const { data: childById } = useOrganismsByIds(childIds);

  const grouped = new Map<string, ChildSummary[]>();

  for (const childId of childIds) {
    const data = childById?.[childId];
    const typeId = data?.currentState?.contentTypeId ?? 'unknown';
    const childPayload = (data?.currentState?.payload ?? null) as Record<string, unknown> | null;
    const fileReference =
      childPayload && typeof childPayload.fileReference === 'string' ? childPayload.fileReference : undefined;
    const list = grouped.get(typeId) ?? [];
    list.push({
      id: childId,
      name: data?.organism.name ?? childId,
      contentTypeId: typeId,
      fileReference,
    });
    grouped.set(typeId, list);
  }

  const orderedSectionIds = Array.from(grouped.keys()).sort((a, b) => sectionOrder(a) - sectionOrder(b));

  return (
    <div className="song-renderer">
      <header className="song-header">
        <span className="song-status">{payload.status ?? 'draft'}</span>
        <h1 className="song-title">{payload.title ?? 'Untitled Song'}</h1>
        <p className="song-artist">{payload.artistCredit ?? 'Unknown Artist'}</p>
        <div className="song-tech">
          {payload.tempoBpm != null && <span>{payload.tempoBpm} BPM</span>}
          {payload.keySignature && <span>{payload.keySignature}</span>}
        </div>
        {payload.notes && <p className="song-notes">{payload.notes}</p>}
      </header>

      <section className="song-sections">
        {loading && <p className="song-empty">Loading composition...</p>}

        {!loading && orderedSectionIds.length === 0 && (
          <p className="song-empty">
            No composed assets yet. Use composition to add cover art, mixes, source, and stems.
          </p>
        )}

        {orderedSectionIds.map((typeId) => {
          const rows = grouped.get(typeId) ?? [];
          return (
            <div key={typeId} className="song-section">
              <h2>{sectionLabel(typeId)}</h2>
              <ul>
                {rows.map((row) => (
                  <li key={row.id} data-rendered-child="true">
                    <span className="song-section-type">{row.contentTypeId}</span>
                    <span className="song-section-name">{row.name}</span>
                    {row.contentTypeId === 'audio' && row.fileReference ? (
                      <audio
                        className="song-section-audio-player"
                        controls
                        preload="none"
                        src={resolvePublicFileUrl(row.fileReference)}
                      >
                        <track kind="captions" src="data:text/vtt,WEBVTT%0A" srcLang="en" label="English captions" />
                        Your browser does not support audio playback.
                      </audio>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
