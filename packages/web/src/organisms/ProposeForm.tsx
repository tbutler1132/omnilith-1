/**
 * ProposeForm — form for offering a new state to an organism.
 *
 * Adapts based on openTrunk: open-trunk organisms get direct appendState,
 * regulated organisms get openProposal. Same form, different API call,
 * different heading.
 */

import { type FormEvent, useState } from 'react';
import { appendState, openProposal } from '../api/organisms.js';

interface ContentTypeOption {
  id: string;
  label: string;
  payloadExample?: string;
}

const CONTENT_TYPES: ContentTypeOption[] = [
  { id: 'text', label: 'Text' },
  {
    id: 'audio',
    label: 'Audio',
    payloadExample:
      '{\n  "fileReference": "dev/audio/track-v2.wav",\n  "durationSeconds": 180,\n  "format": "wav",\n  "sampleRate": 48000,\n  "metadata": {\n    "title": "Track v2",\n    "artist": "Artist"\n  }\n}',
  },
  {
    id: 'image',
    label: 'Image',
    payloadExample:
      '{\n  "fileReference": "dev/images/cover-v2.jpg",\n  "width": 1600,\n  "height": 1600,\n  "format": "jpg",\n  "metadata": {\n    "title": "Cover v2"\n  }\n}',
  },
  {
    id: 'spatial-map',
    label: 'Spatial Map',
    payloadExample: '{\n  "entries": [],\n  "width": 2000,\n  "height": 2000\n}',
  },
  {
    id: 'composition-reference',
    label: 'Composition Reference',
    payloadExample: '{\n  "entries": [],\n  "arrangementType": "sequential"\n}',
  },
  {
    id: 'integration-policy',
    label: 'Integration Policy',
    payloadExample: '{\n  "mode": "single-integrator",\n  "integratorId": "usr_123"\n}',
  },
  { id: 'thread', label: 'Thread', payloadExample: '{\n  "title": "Discussion",\n  "appendOnly": true\n}' },
  {
    id: 'song',
    label: 'Song',
    payloadExample:
      '{\n  "title": "Untitled Song",\n  "artistCredit": "Unknown Artist",\n  "status": "draft",\n  "tempoBpm": 120,\n  "keySignature": "A minor"\n}',
  },
  {
    id: 'daw-project',
    label: 'DAW Project',
    payloadExample:
      '{\n  "fileReference": "dev/projects/song-v2.als",\n  "daw": "ableton-live",\n  "format": "als",\n  "versionLabel": "v2"\n}',
  },
  {
    id: 'stems-bundle',
    label: 'Stems Bundle',
    payloadExample:
      '{\n  "fileReference": "dev/stems/song-v2.zip",\n  "format": "zip",\n  "stemCount": 12,\n  "sampleRate": 48000,\n  "bitDepth": 24\n}',
  },
];

const CONTENT_TYPE_BY_ID = new Map(CONTENT_TYPES.map((option) => [option.id, option]));

interface ProposeFormProps {
  organismId: string;
  currentContentTypeId: string;
  currentPayload: unknown;
  openTrunk: boolean;
  onComplete: () => void;
  onClose: () => void;
}

interface TextPayload {
  content?: string;
  format?: 'plaintext' | 'markdown';
}

function toPrettyJson(payload: unknown): string {
  if (payload === undefined) return '{}';
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return '{}';
  }
}

function asTextPayload(payload: unknown): TextPayload {
  if (!payload || typeof payload !== 'object') return {};
  const p = payload as TextPayload;
  return p;
}

export function ProposeForm({
  organismId,
  currentContentTypeId,
  currentPayload,
  openTrunk,
  onComplete,
  onClose,
}: ProposeFormProps) {
  const initialTextPayload = currentContentTypeId === 'text' ? asTextPayload(currentPayload) : {};
  const [contentTypeId, setContentTypeId] = useState(currentContentTypeId);
  const [format, setFormat] = useState<'plaintext' | 'markdown'>(initialTextPayload.format ?? 'plaintext');
  const [textContent, setTextContent] = useState(initialTextPayload.content ?? '');
  const [jsonPayload, setJsonPayload] = useState(
    currentContentTypeId === 'text'
      ? (CONTENT_TYPE_BY_ID.get(currentContentTypeId)?.payloadExample ?? '{}')
      : toPrettyJson(currentPayload),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [jsonError, setJsonError] = useState('');

  const selectedType = CONTENT_TYPE_BY_ID.get(contentTypeId);
  const canUseCurrentState = contentTypeId === currentContentTypeId;

  function parseJsonPayload(): unknown {
    try {
      return JSON.parse(jsonPayload);
    } catch {
      throw new Error('Payload JSON is invalid. Use example or current state to start from a valid shape.');
    }
  }

  function buildPayload(): unknown {
    if (contentTypeId === 'text') {
      return { content: textContent, format };
    }
    return parseJsonPayload();
  }

  function handleContentTypeSelect(nextContentTypeId: string) {
    setContentTypeId(nextContentTypeId);
    setError('');
    setJsonError('');

    if (nextContentTypeId === 'text') {
      if (currentContentTypeId === 'text') {
        const payload = asTextPayload(currentPayload);
        setFormat(payload.format ?? 'plaintext');
        setTextContent(payload.content ?? '');
      } else {
        setFormat('plaintext');
        setTextContent('');
      }
      return;
    }

    if (nextContentTypeId === currentContentTypeId) {
      setJsonPayload(toPrettyJson(currentPayload));
      return;
    }

    const example = CONTENT_TYPE_BY_ID.get(nextContentTypeId)?.payloadExample;
    if (example) {
      setJsonPayload(example);
    } else {
      setJsonPayload('{}');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setJsonError('');

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
      if (openTrunk) {
        await appendState(organismId, contentTypeId, payload);
      } else {
        await openProposal(organismId, contentTypeId, payload);
      }
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  const heading = openTrunk ? 'Append State' : 'Open Proposal';
  const submitLabel = openTrunk ? 'Append' : 'Propose';
  const submittingLabel = openTrunk ? 'Appending...' : 'Proposing...';

  return (
    <div className="propose-form">
      <h2>{heading}</h2>

      <form onSubmit={handleSubmit}>
        <label htmlFor="pf-content-type">Content type</label>
        <select id="pf-content-type" value={contentTypeId} onChange={(e) => handleContentTypeSelect(e.target.value)}>
          {CONTENT_TYPES.map((ct) => (
            <option key={ct.id} value={ct.id}>
              {ct.label}
            </option>
          ))}
        </select>

        {contentTypeId === 'text' ? (
          <>
            <label htmlFor="pf-format">Format</label>
            <select
              id="pf-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as 'plaintext' | 'markdown')}
            >
              <option value="plaintext">Plaintext</option>
              <option value="markdown">Markdown</option>
            </select>

            <label htmlFor="pf-text-content">Content</label>
            <textarea
              id="pf-text-content"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={4}
              placeholder="Write something..."
            />
          </>
        ) : (
          <>
            <div className="propose-payload-tools">
              <label htmlFor="pf-json-payload">Payload (JSON)</label>
              <div className="propose-payload-tool-buttons">
                {selectedType?.payloadExample && (
                  <button
                    type="button"
                    className="secondary propose-payload-btn"
                    onClick={() => {
                      setJsonPayload(selectedType.payloadExample ?? '{}');
                      setJsonError('');
                    }}
                  >
                    Use example
                  </button>
                )}
                {canUseCurrentState && (
                  <button
                    type="button"
                    className="secondary propose-payload-btn"
                    onClick={() => {
                      setJsonPayload(toPrettyJson(currentPayload));
                      setJsonError('');
                    }}
                  >
                    Use current state
                  </button>
                )}
              </div>
            </div>
            <textarea
              id="pf-json-payload"
              value={jsonPayload}
              onChange={(e) => {
                setJsonPayload(e.target.value);
                if (jsonError) setJsonError('');
              }}
              rows={4}
              placeholder='{ "key": "value" }'
            />
            <p className="propose-json-hint">
              Shape must match the selected content type. Use example/current state to avoid schema mismatch.
            </p>
            {jsonError && <p className="error">{jsonError}</p>}
          </>
        )}

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? submittingLabel : submitLabel}
          </button>
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
