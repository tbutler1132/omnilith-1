/**
 * Kernel — the eight infrastructure concerns.
 *
 * The kernel implements exactly these eight operations. These are the
 * complete set of operations the system provides. Everything else is
 * content types and composition.
 */

const concerns = [
  {
    number: 1,
    name: 'Organism Identity',
    description: 'Create, reference, exist. Every organism gets a persistent identity that endures through all state changes.',
    types: ['OrganismId', 'Organism', 'OrganismRepository'],
  },
  {
    number: 2,
    name: 'State Management',
    description: 'Append immutable state, retrieve current, retrieve history. States are self-describing — each carries its own content type.',
    types: ['OrganismState', 'StateId', 'appendState'],
  },
  {
    number: 3,
    name: 'Composition',
    description: 'Place inside, remove, query containment. Composition creates boundaries. Cross-boundary inclusion requires forking.',
    types: ['compose', 'decompose', 'queryChildren', 'queryParent'],
  },
  {
    number: 4,
    name: 'Visibility & Access',
    description: 'Who can see, who can interact. All permission logic in a single central module — one file, one decision tree.',
    types: ['checkAccess', 'AccessControl'],
  },
  {
    number: 5,
    name: 'Proposal Evaluation',
    description: 'Consult policy organisms, evaluate proposed state changes. Regulation emerges from composition, not from the primitive.',
    types: ['Proposal', 'openProposal', 'evaluateProposal', 'integrateProposal'],
  },
  {
    number: 6,
    name: 'Event Emission',
    description: 'Record every mutation, make observable. An append-only log of everything that happens. Infrastructure speaks through events.',
    types: ['Event', 'EventPublisher'],
  },
  {
    number: 7,
    name: 'Content Type Registration',
    description: 'Register schema, validator, optional evaluator. The contract that plugins implement to teach the kernel about new data.',
    types: ['ContentTypeContract', 'ContentTypeRegistry'],
  },
  {
    number: 8,
    name: 'Querying',
    description: 'Cross-cutting retrieval across organisms, states, composition, relationships, and vitality. The read path for everything.',
    types: ['QueryPort'],
  },
];

export function Kernel() {
  return (
    <div className="docs-section">
      <h1>Kernel</h1>
      <p className="docs-lead">
        The kernel implements exactly eight infrastructure concerns. These are the
        complete set of operations the system provides. Everything else is content
        types and composition. Do not add a ninth.
      </p>

      <div className="docs-card-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {concerns.map((c) => (
          <div key={c.number} className="docs-card" style={{ borderTopColor: 'var(--accent)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              marginBottom: 8,
            }}>
              <span style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--accent)',
                fontFamily: "'SF Mono', 'Fira Code', monospace",
              }}>{c.number}</span>
              <h3 style={{ margin: 0 }}>{c.name}</h3>
            </div>
            <p>{c.description}</p>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
              marginTop: 8,
            }}>
              {c.types.map((t) => (
                <code key={t} className="docs-code" style={{ fontSize: 11 }}>{t}</code>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
