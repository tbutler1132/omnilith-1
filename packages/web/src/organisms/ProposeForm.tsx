/**
 * ProposeForm — form for offering a new state to an organism.
 *
 * Adapts based on openTrunk: open-trunk organisms get direct appendState,
 * regulated organisms get openProposal. Same form, different API call,
 * different heading.
 */

import { type FormEvent, useState } from 'react';
import { appendState, openProposal } from '../api/organisms.js';

const CONTENT_TYPES = [
  { id: 'text', label: 'Text' },
  { id: 'audio', label: 'Audio' },
  { id: 'image', label: 'Image' },
  { id: 'spatial-map', label: 'Spatial Map' },
  { id: 'composition-reference', label: 'Composition Reference' },
  { id: 'integration-policy', label: 'Integration Policy' },
  { id: 'thread', label: 'Thread' },
];

interface ProposeFormProps {
  organismId: string;
  currentContentTypeId: string;
  openTrunk: boolean;
  onComplete: () => void;
  onClose: () => void;
}

export function ProposeForm({ organismId, currentContentTypeId, openTrunk, onComplete, onClose }: ProposeFormProps) {
  const [contentTypeId, setContentTypeId] = useState(currentContentTypeId);
  const [format, setFormat] = useState<'plaintext' | 'markdown'>('plaintext');
  const [textContent, setTextContent] = useState('');
  const [jsonPayload, setJsonPayload] = useState('{}');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function buildPayload(): unknown {
    if (contentTypeId === 'text') {
      return { content: textContent, format };
    }
    return JSON.parse(jsonPayload);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
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
        <select id="pf-content-type" value={contentTypeId} onChange={(e) => setContentTypeId(e.target.value)}>
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
            <label htmlFor="pf-json-payload">Payload (JSON)</label>
            <textarea
              id="pf-json-payload"
              value={jsonPayload}
              onChange={(e) => setJsonPayload(e.target.value)}
              rows={4}
              placeholder='{ "key": "value" }'
            />
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
