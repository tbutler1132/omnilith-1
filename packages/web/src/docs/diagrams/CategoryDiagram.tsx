/**
 * CategoryDiagram — the four categories of the complete ontology.
 *
 * Everything in the system is exactly one of: infrastructure, organisms,
 * relationships, or rendering. Nothing spans categories.
 */

const categories = [
  {
    name: 'Infrastructure',
    description: 'The physics. Eight concerns that make organisms possible.',
    examples: 'Identity, state management, composition, events',
    color: 'var(--accent)',
  },
  {
    name: 'Organisms',
    description: 'Living things. The single primitive, composed of organisms.',
    examples: 'Audio, text, maps, policies, sensors',
    color: 'var(--green)',
  },
  {
    name: 'Relationships',
    description: 'Connective tissue between people and organisms.',
    examples: 'Membership, integration authority',
    color: 'var(--amber)',
  },
  {
    name: 'Rendering',
    description: 'The perceptual interface. How organisms become visible.',
    examples: 'Renderers, differs, universal layer',
    color: '#f87171',
  },
];

export function CategoryDiagram() {
  return (
    <div className="docs-diagram">
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        maxWidth: 520,
        margin: '0 auto',
      }}>
        {categories.map((cat) => (
          <div
            key={cat.name}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderLeft: `3px solid ${cat.color}`,
              borderRadius: 8,
              padding: '16px 18px',
            }}
          >
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: cat.color,
              marginBottom: 4,
            }}>{cat.name}</div>
            <div style={{
              fontSize: 13,
              color: 'var(--text)',
              marginBottom: 6,
              lineHeight: 1.4,
            }}>{cat.description}</div>
            <div style={{
              fontSize: 11,
              color: 'var(--text-dim)',
            }}>{cat.examples}</div>
          </div>
        ))}
      </div>
      <p style={{
        textAlign: 'center',
        fontSize: 12,
        color: 'var(--text-dim)',
        marginTop: 14,
      }}>
        Everything is exactly one of these. Nothing spans categories.
      </p>
    </div>
  );
}
