/**
 * ContentTypes — all registered content types grouped by tier.
 *
 * Data-driven from content-type-metadata.ts. Each tier has a distinct
 * border color: accent for creative, amber for governance, green for awareness.
 */

import { contentTypeMetadata } from '../content-type-metadata.js';

const tierColors: Record<number, string> = {
  1: 'var(--accent)',
  2: 'var(--amber)',
  3: 'var(--green)',
};

const tiers = [
  {
    tier: 1 as const,
    label: 'Tier 1 — Creative Fundamentals',
    description: 'The minimum viable studio. Audio, text, images, spatial maps, composition references, and threads.',
  },
  {
    tier: 2 as const,
    label: 'Tier 2 — Governance',
    description: 'Required when communities grow. Policies that evaluate proposals to parent organisms.',
  },
  {
    tier: 3 as const,
    label: 'Tier 3 — Awareness',
    description:
      'The cybernetic layer. Sensors, variables, and response policies composed together create feedback loops.',
  },
];

export function ContentTypes() {
  return (
    <div className="docs-section">
      <h1>Content Types</h1>
      <p className="docs-lead">
        Every content type registers a contract: schema, validator, and optional evaluator. Content types are plugins —
        they teach the kernel how to handle specific kinds of data. New capabilities enter through new content types,
        never through kernel modifications.
      </p>

      {tiers.map((tierInfo) => {
        const types = contentTypeMetadata.filter((ct) => ct.tier === tierInfo.tier);
        const color = tierColors[tierInfo.tier];

        return (
          <div key={tierInfo.tier} className="docs-tier-group" style={{ borderLeftColor: color }}>
            <h2 style={{ color }}>{tierInfo.label}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>{tierInfo.description}</p>

            <div className="docs-card-grid" style={{ gridTemplateColumns: '1fr' }}>
              {types.map((ct) => (
                <div key={ct.typeId} className="docs-card" style={{ borderTopColor: color }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <code
                      className="docs-code"
                      style={{
                        background: 'var(--bg)',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {ct.typeId}
                    </code>
                    <h3 style={{ margin: 0 }}>{ct.displayName}</h3>
                    {ct.hasEvaluator && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: 'var(--amber)',
                          border: '1px solid var(--amber)',
                          borderRadius: 4,
                          padding: '1px 6px',
                        }}
                      >
                        evaluator
                      </span>
                    )}
                  </div>
                  <p style={{ marginBottom: 12 }}>{ct.description}</p>

                  {/* Schema fields */}
                  <table className="docs-table">
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>Type</th>
                        <th></th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ct.fields.map((f) => (
                        <tr key={f.name}>
                          <td>
                            <code className="docs-code">{f.name}</code>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{f.type}</td>
                          <td style={{ fontSize: 10, color: f.required ? 'var(--green)' : 'var(--text-dim)' }}>
                            {f.required ? 'required' : 'optional'}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{f.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Example payload */}
                  <details style={{ marginTop: 8 }}>
                    <summary
                      style={{
                        fontSize: 12,
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      Example payload
                    </summary>
                    <pre className="docs-pre">{JSON.stringify(ct.examplePayload, null, 2)}</pre>
                  </details>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
