/**
 * HudTemplateValuesPanel — visor panel for template value customization.
 *
 * Allows setting initial song values before template instantiation and
 * opens the created organism in the visor on success.
 */

import { type FormEvent, useState } from 'react';
import { instantiateTemplate } from '../../../api/organisms.js';
import type { SongStatus, TemplateSongCustomization } from '../../template-values.js';

interface HudTemplateValuesPanelProps {
  customization: TemplateSongCustomization;
  onCancel: () => void;
  onTemplateInstantiated: (organismId: string) => void;
}

function findPrimaryCreatedOrganism(
  organisms: ReadonlyArray<{ ref: string; organismId: string }>,
  preferredRef: string,
): { ref: string; organismId: string } | undefined {
  const exact = organisms.find((entry) => entry.ref === preferredRef);
  if (exact) return exact;
  return organisms.find((entry) => entry.ref === 'song') ?? organisms[0];
}

export function HudTemplateValuesPanel({
  customization,
  onCancel,
  onTemplateInstantiated,
}: HudTemplateValuesPanelProps) {
  const [songTitle, setSongTitle] = useState(customization.seedPayload.title);
  const [songArtistCredit, setSongArtistCredit] = useState(customization.seedPayload.artistCredit);
  const [songStatus, setSongStatus] = useState<SongStatus>(customization.seedPayload.status);
  const [songTempoBpm, setSongTempoBpm] = useState(
    customization.seedPayload.tempoBpm !== undefined ? String(customization.seedPayload.tempoBpm) : '',
  );
  const [songKeySignature, setSongKeySignature] = useState(customization.seedPayload.keySignature ?? '');
  const [songNotes, setSongNotes] = useState(customization.seedPayload.notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleInstantiateWithValues(e: FormEvent) {
    e.preventDefault();

    const title = songTitle.trim();
    const artistCredit = songArtistCredit.trim();
    const keySignature = songKeySignature.trim();
    const notes = songNotes;
    const tempoRaw = songTempoBpm.trim();

    if (title.length === 0) {
      setError('Song title is required.');
      return;
    }

    if (artistCredit.length === 0) {
      setError('Artist credit is required.');
      return;
    }

    let tempoBpm: number | undefined;
    if (tempoRaw.length > 0) {
      const parsed = Number(tempoRaw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError('Tempo must be a positive number.');
        return;
      }
      tempoBpm = parsed;
    }

    const payload: Record<string, unknown> = {
      ...customization.seedPayload.basePayload,
      title,
      artistCredit,
      status: songStatus,
    };

    if (tempoBpm !== undefined) payload.tempoBpm = tempoBpm;
    else delete payload.tempoBpm;

    if (keySignature.length > 0) payload.keySignature = keySignature;
    else delete payload.keySignature;

    if (notes.length > 0) payload.notes = notes;
    else delete payload.notes;

    setError('');
    setSubmitting(true);

    try {
      const res = await instantiateTemplate(customization.templateId, {
        overrides: {
          [customization.songStepRef]: {
            initialPayload: payload,
          },
        },
      });

      const primary = findPrimaryCreatedOrganism(res.organisms, customization.songStepRef);
      if (!primary) {
        throw new Error('Template created no organisms');
      }

      onTemplateInstantiated(primary.organismId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to instantiate template');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="hud-template-values">
      <div className="hud-template-values-header">
        <div>
          <h3>{customization.templateName}</h3>
          <p>Set initial song values before threshold.</p>
        </div>
        <button type="button" className="secondary" onClick={onCancel}>
          Back
        </button>
      </div>

      <form className="hud-template-values-form" onSubmit={handleInstantiateWithValues}>
        <label htmlFor="song-title">Title</label>
        <input id="song-title" type="text" value={songTitle} onChange={(e) => setSongTitle(e.target.value)} required />

        <label htmlFor="song-artist-credit">Artist credit</label>
        <input
          id="song-artist-credit"
          type="text"
          value={songArtistCredit}
          onChange={(e) => setSongArtistCredit(e.target.value)}
          required
        />

        <label htmlFor="song-status">Status</label>
        <select id="song-status" value={songStatus} onChange={(e) => setSongStatus(e.target.value as SongStatus)}>
          <option value="idea">idea</option>
          <option value="draft">draft</option>
          <option value="mixing">mixing</option>
          <option value="mastered">mastered</option>
          <option value="released">released</option>
        </select>

        <label htmlFor="song-tempo">Tempo BPM</label>
        <input
          id="song-tempo"
          type="number"
          min="1"
          step="1"
          value={songTempoBpm}
          onChange={(e) => setSongTempoBpm(e.target.value)}
          placeholder="120"
        />

        <label htmlFor="song-key-signature">Key signature</label>
        <input
          id="song-key-signature"
          type="text"
          value={songKeySignature}
          onChange={(e) => setSongKeySignature(e.target.value)}
          placeholder="A minor"
        />

        <label htmlFor="song-notes">Notes</label>
        <textarea
          id="song-notes"
          value={songNotes}
          onChange={(e) => setSongNotes(e.target.value)}
          rows={5}
          placeholder="Optional notes..."
        />

        {error && <p className="hud-info-error">{error}</p>}

        <div className="form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Instantiating...' : 'Instantiate With Values'}
          </button>
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
