/**
 * ThresholdForm — modal form for introducing a new organism to the platform.
 *
 * Collects content type, payload, and open-trunk preference. On submit,
 * calls thresholdOrganism and notifies the parent via onCreated.
 */

import { type FormEvent, useState } from 'react';
import { thresholdOrganism } from '../api/organisms.js';

const CONTENT_TYPES = [
  { id: 'text', label: 'Text' },
  { id: 'audio', label: 'Audio' },
  { id: 'image', label: 'Image' },
  { id: 'spatial-map', label: 'Spatial Map' },
  { id: 'composition-reference', label: 'Composition Reference' },
  { id: 'integration-policy', label: 'Integration Policy' },
  { id: 'thread', label: 'Thread' },
];

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
      const result = await thresholdOrganism({ name, contentTypeId, payload, openTrunk });
      onCreated(result.organism.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to threshold organism');
    } finally {
      setSubmitting(false);
    }
  }

  const formInner = (
    <>
      <h2>Threshold Organism</h2>
      <p>Introduce something new to the platform.</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="tf-name">Name</label>
        <input
          id="tf-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Give it a name..."
          required
        />

        <label htmlFor="tf-content-type">Content type</label>
        <select id="tf-content-type" value={contentTypeId} onChange={(e) => setContentTypeId(e.target.value)}>
          {CONTENT_TYPES.map((ct) => (
            <option key={ct.id} value={ct.id}>
              {ct.label}
            </option>
          ))}
        </select>

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
              rows={5}
              placeholder="Write something..."
            />
          </>
        ) : (
          <>
            <label htmlFor="tf-json-payload">Payload (JSON)</label>
            <textarea
              id="tf-json-payload"
              value={jsonPayload}
              onChange={(e) => setJsonPayload(e.target.value)}
              rows={5}
              placeholder='{ "key": "value" }'
            />
          </>
        )}

        <label className="checkbox-label">
          <input type="checkbox" checked={openTrunk} onChange={(e) => setOpenTrunk(e.target.checked)} />
          Open-trunk (allow direct state changes without proposals)
        </label>

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Thresholding...' : 'Threshold'}
          </button>
          {!inline && (
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </>
  );

  if (inline) return <div className="threshold-form">{formInner}</div>;

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
