/**
 * HudTemplates — template browser and instantiation panel.
 *
 * Lists template organisms and lets the user instantiate one into
 * a composed organism bundle using the existing template route.
 */

import { useEffect, useMemo, useState } from 'react';
import { fetchOrganisms, instantiateTemplate } from '../api/organisms.js';

interface TemplateItem {
  id: string;
  name: string;
  description: string;
  stepCount: number;
}

interface HudTemplatesProps {
  onTemplateInstantiated: (organismId: string) => void;
}

function parseTemplatePreview(payload: unknown): { description: string; stepCount: number } {
  if (!payload || typeof payload !== 'object') {
    return { description: '', stepCount: 0 };
  }

  const p = payload as { description?: unknown; recipe?: unknown };
  const description = typeof p.description === 'string' ? p.description : '';
  const stepCount = Array.isArray(p.recipe) ? p.recipe.length : 0;

  return { description, stepCount };
}

export function HudTemplates({ onTemplateInstantiated }: HudTemplatesProps) {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [instantiatingId, setInstantiatingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchOrganisms({ contentTypeId: 'template', limit: 100 })
      .then((res) => {
        if (cancelled) return;

        const mapped = res.organisms.map(({ organism, currentState }) => {
          const preview = parseTemplatePreview(currentState?.payload);
          return {
            id: organism.id,
            name: organism.name,
            description: preview.description,
            stepCount: preview.stepCount,
          } satisfies TemplateItem;
        });

        setTemplates(mapped);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load templates');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(() => templates.slice().sort((a, b) => a.name.localeCompare(b.name)), [templates]);

  async function handleInstantiate(templateId: string) {
    setError('');
    setInstantiatingId(templateId);

    try {
      const res = await instantiateTemplate(templateId);
      const song = res.organisms.find((entry) => entry.ref === 'song') ?? res.organisms[0];
      if (!song) {
        throw new Error('Template created no organisms');
      }
      onTemplateInstantiated(song.organismId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to instantiate template');
    } finally {
      setInstantiatingId(null);
    }
  }

  if (loading) {
    return (
      <div className="hud-templates-state">
        <h3>Templates</h3>
        <p>Loading templates...</p>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="hud-templates-state">
        <h3>Templates</h3>
        <p>No templates available yet.</p>
      </div>
    );
  }

  return (
    <div className="hud-templates">
      <header className="hud-templates-header">
        <div>
          <h3>Templates</h3>
          <p>Instantiate a composition recipe, then tend the new organism.</p>
        </div>
      </header>

      <ul className="hud-template-list">
        {sorted.map((template) => (
          <li key={template.id} className="hud-template-item">
            <div className="hud-template-item-main">
              <span className="hud-template-name">{template.name}</span>
              {template.description && <p className="hud-template-description">{template.description}</p>}
              <span className="hud-template-meta">{template.stepCount} recipe steps</span>
            </div>
            <button
              type="button"
              className="hud-map-btn"
              onClick={() => handleInstantiate(template.id)}
              disabled={instantiatingId === template.id}
            >
              {instantiatingId === template.id ? 'Instantiating...' : 'Instantiate'}
            </button>
          </li>
        ))}
      </ul>

      {error && <p className="hud-info-error">{error}</p>}
    </div>
  );
}
