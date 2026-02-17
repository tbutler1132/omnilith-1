/**
 * ThresholdForm — form for introducing a new organism to the platform.
 *
 * Collects content type, payload, and open-trunk preference. On submit,
 * calls thresholdOrganism and notifies the parent via onCreated.
 */

import { type FormEvent, useMemo, useState } from 'react';
import { thresholdOrganism } from '../../../api/organisms.js';

interface ContentTypeOption {
  id: string;
  label: string;
  summary: string;
  payloadExample?: string;
}

const CONTENT_TYPES: ContentTypeOption[] = [
  { id: 'text', label: 'Text', summary: 'Notes, writing, and drafts.' },
  {
    id: 'audio',
    label: 'Audio',
    summary: 'Songs, clips, and sound studies.',
    payloadExample:
      '{\n  "fileReference": "dev/audio/untitled-track.mp3",\n  "durationSeconds": 180,\n  "format": "mp3",\n  "metadata": {\n    "title": "Untitled Track"\n  }\n}',
  },
  {
    id: 'image',
    label: 'Image',
    summary: 'Stills, artwork, and references.',
    payloadExample:
      '{\n  "fileReference": "dev/images/cover.jpg",\n  "width": 1600,\n  "height": 1600,\n  "format": "jpg",\n  "metadata": {\n    "title": "Cover Art"\n  }\n}',
  },
  {
    id: 'song',
    label: 'Song',
    summary: 'Song identity and state only. Use a template to scaffold cover, source, stems, and mix organisms.',
    payloadExample:
      '{\n  "title": "Untitled Song",\n  "artistCredit": "Unknown Artist",\n  "status": "draft",\n  "tempoBpm": 120\n}',
  },
  {
    id: 'daw-project',
    label: 'DAW Project',
    summary: 'Source production file from a DAW session.',
    payloadExample:
      '{\n  "fileReference": "dev/projects/song-v1.als",\n  "daw": "ableton-live",\n  "format": "als",\n  "versionLabel": "v1"\n}',
  },
  {
    id: 'stems-bundle',
    label: 'Stems Bundle',
    summary: 'Exported stems package for collaboration or delivery.',
    payloadExample:
      '{\n  "fileReference": "dev/stems/song-v1.zip",\n  "format": "zip",\n  "stemCount": 10,\n  "sampleRate": 48000,\n  "bitDepth": 24\n}',
  },
  {
    id: 'spatial-map',
    label: 'Spatial Map',
    summary: 'A curated map for surfacing organisms.',
    payloadExample: '{\n  "width": 2000,\n  "height": 2000,\n  "entries": []\n}',
  },
  {
    id: 'composition-reference',
    label: 'Composition Reference',
    summary: 'A playlist or collection arranged from organism references.',
    payloadExample: '{\n  "entries": [],\n  "arrangementType": "sequential"\n}',
  },
  {
    id: 'integration-policy',
    label: 'Integration Policy',
    summary: 'Regulation policy for proposal evaluation.',
    payloadExample: '{\n  "mode": "single-integrator",\n  "integratorUserIds": []\n}',
  },
  {
    id: 'thread',
    label: 'Thread',
    summary: 'Open-trunk conversation organism.',
    payloadExample: '{\n  "title": "Conversation"\n}',
  },
];

const CONTENT_TYPE_BY_ID = new Map(CONTENT_TYPES.map((option) => [option.id, option]));

interface ThresholdFormProps {
  onCreated: (organismId: string) => void;
  onClose: () => void;
  /** When true, renders the form directly without a modal overlay. */
  inline?: boolean;
}

export function ThresholdForm({ onCreated, onClose, inline }: ThresholdFormProps) {
  const [name, setName] = useState('');
  const [contentTypeId, setContentTypeId] = useState('text');
  const [format, setFormat] = useState<'plaintext' | 'markdown'>('plaintext');
  const [textContent, setTextContent] = useState('');
  const [jsonPayload, setJsonPayload] = useState('{}');
  const [openTrunk, setOpenTrunk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [jsonError, setJsonError] = useState('');

  const selectedType = useMemo(() => CONTENT_TYPE_BY_ID.get(contentTypeId) ?? CONTENT_TYPES[0], [contentTypeId]);
  const openTrunkRecommended = contentTypeId === 'thread';

  function handleContentTypeSelect(nextContentTypeId: string) {
    setContentTypeId(nextContentTypeId);
    setJsonError('');
    if (nextContentTypeId !== 'text' && jsonPayload.trim() === '{}') {
      const example = CONTENT_TYPE_BY_ID.get(nextContentTypeId)?.payloadExample;
      if (example) setJsonPayload(example);
    }
  }

  function parseJsonPayload(): unknown {
    try {
      return JSON.parse(jsonPayload);
    } catch {
      throw new Error('Payload JSON is invalid. Please fix the syntax and try again.');
    }
  }

  function buildPayload(): unknown {
    if (contentTypeId === 'text') {
      return { content: textContent, format };
    }
    return parseJsonPayload();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setJsonError('');

    if (name.trim().length === 0) {
      setError('Name is required.');
      return;
    }

    if (contentTypeId !== 'text') {
      try {
        parseJsonPayload();
      } catch (err) {
        setJsonError(err instanceof Error ? err.message : 'Payload JSON is invalid.');
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = buildPayload();
      const result = await thresholdOrganism({
        name: name.trim(),
        contentTypeId,
        payload,
        openTrunk,
      });
      onCreated(result.organism.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to threshold organism');
    } finally {
      setSubmitting(false);
    }
  }

  const formInner = (
    <>
      <div className="threshold-form-header">
        <div>
          <h2>Threshold Organism</h2>
          <p>Threshold introduces one organism with one initial state. For multi-organism scaffolds, use Templates.</p>
        </div>
        <button
          type="button"
          className="secondary threshold-form-close"
          onClick={onClose}
          aria-label="Close threshold form"
        >
          Close
        </button>
      </div>

      <div className="threshold-progress" aria-hidden="true">
        <span className={name.trim() ? 'is-complete' : ''}>Name</span>
        <span className="is-complete">Content Type</span>
        <span className={contentTypeId === 'text' || jsonPayload.trim() ? 'is-complete' : ''}>Initial State</span>
        <span className="is-complete">Integration Mode</span>
      </div>

      <form onSubmit={handleSubmit}>
        <label htmlFor="tf-name">Name</label>
        <input
          id="tf-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Give this organism a clear identity..."
          required
        />

        <p className="threshold-field-label">Content type</p>
        <div className="threshold-content-types" role="listbox" aria-label="Select content type">
          {CONTENT_TYPES.map((ct) => {
            const selected = ct.id === contentTypeId;
            return (
              <button
                key={ct.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={`threshold-content-type ${selected ? 'threshold-content-type--selected' : ''}`}
                onClick={() => handleContentTypeSelect(ct.id)}
              >
                <strong>{ct.label}</strong>
                <span>{ct.summary}</span>
              </button>
            );
          })}
        </div>

        {contentTypeId === 'text' ? (
          <>
            <label htmlFor="tf-format">Format</label>
            <select
              id="tf-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as 'plaintext' | 'markdown')}
            >
              <option value="plaintext">Plaintext</option>
              <option value="markdown">Markdown</option>
            </select>

            <label htmlFor="tf-text-content">Content</label>
            <textarea
              id="tf-text-content"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={6}
              placeholder="Write the first state..."
            />
          </>
        ) : (
          <>
            <div className="threshold-payload-header">
              <label htmlFor="tf-json-payload">Payload (JSON)</label>
              {selectedType.payloadExample && (
                <button
                  type="button"
                  className="secondary threshold-example-btn"
                  onClick={() => {
                    setJsonPayload(selectedType.payloadExample ?? '{}');
                    setJsonError('');
                  }}
                >
                  Use example
                </button>
              )}
            </div>
            <textarea
              id="tf-json-payload"
              value={jsonPayload}
              onChange={(e) => {
                setJsonPayload(e.target.value);
                if (jsonError) setJsonError('');
              }}
              rows={8}
              placeholder='{ "key": "value" }'
            />
            {jsonError && <p className="error">{jsonError}</p>}
          </>
        )}

        <div className="threshold-mode">
          <fieldset className="threshold-mode-fieldset">
            <legend className="threshold-field-label">Integration mode</legend>
            <div className="threshold-mode-options">
              <label className={`threshold-mode-option ${!openTrunk ? 'threshold-mode-option--selected' : ''}`}>
                <input type="radio" name="integration-mode" checked={!openTrunk} onChange={() => setOpenTrunk(false)} />
                <span>
                  <strong>Review First</strong>
                  <small>Changes are offered as proposals before integration.</small>
                </span>
              </label>
              <label className={`threshold-mode-option ${openTrunk ? 'threshold-mode-option--selected' : ''}`}>
                <input type="radio" name="integration-mode" checked={openTrunk} onChange={() => setOpenTrunk(true)} />
                <span>
                  <strong>Instant Integrate (open-trunk)</strong>
                  <small>Changes integrate immediately without a proposal review step.</small>
                </span>
              </label>
            </div>
          </fieldset>
          {openTrunkRecommended && (
            <p className="threshold-mode-note">Recommended for thread organisms and fast conversational flows.</p>
          )}
        </div>

        <div className="threshold-next">
          <p className="threshold-next-label">What happens next</p>
          <p>
            {openTrunk
              ? 'After threshold, authorized stewards can integrate changes directly.'
              : 'After threshold, changes follow the proposal flow before integration.'}
          </p>
        </div>

        <div className="threshold-summary">
          <p>
            Thresholding as <strong>{name.trim() || 'Untitled organism'}</strong> with{' '}
            <strong>{selectedType.label}</strong> state in{' '}
            <strong>{openTrunk ? 'Instant Integrate (open-trunk)' : 'Review First'}</strong> mode.
          </p>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Thresholding...' : 'Threshold Organism'}
          </button>
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </>
  );

  if (inline) return <div className="threshold-form threshold-form--inline">{formInner}</div>;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="threshold-form"
        role="document"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {formInner}
      </div>
    </div>
  );
}
