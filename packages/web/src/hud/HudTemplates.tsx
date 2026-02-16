/**
 * HudTemplates — template browser and instantiation panel.
 *
 * Lists template organisms, supports quick instantiation, and surfaces
 * a song-focused value customization request to the parent HUD panel.
 */

import { useEffect, useMemo, useState } from 'react';
import { fetchOrganisms, instantiateTemplate } from '../api/organisms.js';
import type { SongPayloadDraft, SongStatus, TemplateSongCustomization } from './template-values.js';

interface TemplateRecipeStep {
  readonly ref: string;
  readonly name?: string;
  readonly contentTypeId: string;
  readonly initialPayload: unknown;
}

interface TemplateItem {
  id: string;
  name: string;
  description: string;
  stepCount: number;
  recipe: ReadonlyArray<TemplateRecipeStep>;
}

interface HudTemplatesProps {
  onTemplateInstantiated: (organismId: string) => void;
  onTemplateValuesRequested: (customization: TemplateSongCustomization) => void;
}

function parseTemplatePreview(payload: unknown): {
  description: string;
  stepCount: number;
  recipe: TemplateRecipeStep[];
} {
  if (!payload || typeof payload !== 'object') {
    return { description: '', stepCount: 0, recipe: [] };
  }

  const p = payload as { description?: unknown; recipe?: unknown };
  const description = typeof p.description === 'string' ? p.description : '';
  const recipe = Array.isArray(p.recipe)
    ? p.recipe
        .filter((entry): entry is TemplateRecipeStep => {
          if (!entry || typeof entry !== 'object') return false;
          const step = entry as Partial<TemplateRecipeStep>;
          return (
            typeof step.ref === 'string' &&
            step.ref.length > 0 &&
            typeof step.contentTypeId === 'string' &&
            step.contentTypeId.length > 0 &&
            Object.hasOwn(step, 'initialPayload')
          );
        })
        .map((step) => ({
          ref: step.ref,
          name: step.name,
          contentTypeId: step.contentTypeId,
          initialPayload: step.initialPayload,
        }))
    : [];

  return { description, stepCount: recipe.length, recipe };
}

function findPrimaryCreatedOrganism(
  organisms: ReadonlyArray<{ ref: string; organismId: string }>,
): { ref: string; organismId: string } | undefined {
  return organisms.find((entry) => entry.ref === 'song') ?? organisms[0];
}

function isSongStatus(value: unknown): value is SongStatus {
  return value === 'idea' || value === 'draft' || value === 'mixing' || value === 'mastered' || value === 'released';
}

function readSongDraft(payload: unknown): SongPayloadDraft {
  const fallback: SongPayloadDraft = {
    title: 'Untitled Song',
    artistCredit: 'Unknown Artist',
    status: 'draft',
    basePayload: {},
  };

  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const p = payload as Record<string, unknown>;
  const status = p.status;
  const tempoBpm = p.tempoBpm;

  return {
    title: typeof p.title === 'string' && p.title.trim().length > 0 ? p.title : fallback.title,
    artistCredit:
      typeof p.artistCredit === 'string' && p.artistCredit.trim().length > 0 ? p.artistCredit : fallback.artistCredit,
    status: isSongStatus(status) ? status : fallback.status,
    tempoBpm: typeof tempoBpm === 'number' && Number.isFinite(tempoBpm) && tempoBpm > 0 ? tempoBpm : undefined,
    keySignature: typeof p.keySignature === 'string' && p.keySignature.trim().length > 0 ? p.keySignature : undefined,
    notes: typeof p.notes === 'string' ? p.notes : undefined,
    basePayload: p,
  };
}

export function HudTemplates({ onTemplateInstantiated, onTemplateValuesRequested }: HudTemplatesProps) {
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
            recipe: preview.recipe,
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
      const primary = findPrimaryCreatedOrganism(res.organisms);
      if (!primary) {
        throw new Error('Template created no organisms');
      }
      onTemplateInstantiated(primary.organismId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to instantiate template');
    } finally {
      setInstantiatingId(null);
    }
  }

  function handleWithValues(template: TemplateItem) {
    const songStep = template.recipe.find((step) => step.contentTypeId === 'song');
    if (!songStep) return;

    onTemplateValuesRequested({
      templateId: template.id,
      templateName: template.name,
      songStepRef: songStep.ref,
      seedPayload: readSongDraft(songStep.initialPayload),
    });
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
        {sorted.map((template) => {
          const hasSongStep = template.recipe.some((step) => step.contentTypeId === 'song');
          const isInstantiating = instantiatingId === template.id;

          return (
            <li key={template.id} className="hud-template-item">
              <div className="hud-template-item-main">
                <span className="hud-template-name">{template.name}</span>
                {template.description && <p className="hud-template-description">{template.description}</p>}
                <span className="hud-template-meta">{template.stepCount} recipe steps</span>
              </div>
              <div className="hud-template-actions">
                {hasSongStep && (
                  <button
                    type="button"
                    className="hud-map-btn secondary"
                    onClick={() => handleWithValues(template)}
                    disabled={isInstantiating}
                  >
                    With values
                  </button>
                )}
                <button
                  type="button"
                  className="hud-map-btn"
                  onClick={() => handleInstantiate(template.id)}
                  disabled={isInstantiating}
                >
                  {isInstantiating ? 'Instantiating...' : 'Instantiate'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {error && <p className="hud-info-error">{error}</p>}
    </div>
  );
}
