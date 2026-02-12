/**
 * Vocabulary — the controlled vocabulary reference.
 *
 * These terms have precise meanings. They are used exactly as written
 * in code, file names, variable names, comments, and conversation.
 */

interface VocabEntry {
  term: string;
  meaning: string;
  neverCallIt: string;
}

const primitiveTerms: VocabEntry[] = [
  {
    term: 'organism',
    meaning: 'The single primitive. A bounded evolving identity with state and composition.',
    neverCallIt: 'artifact, item, document, resource, node, entity, object',
  },
  {
    term: 'state',
    meaning: "An immutable snapshot of an organism's current manifestation. Self-describing.",
    neverCallIt: 'version, revision, snapshot',
  },
  {
    term: 'state history',
    meaning: 'The ordered sequence of all states an organism has had.',
    neverCallIt: 'version history, changelog',
  },
  {
    term: 'composition',
    meaning: 'The containment relationship. An organism inside another organism.',
    neverCallIt: 'nesting, hierarchy, tree',
  },
  {
    term: 'boundary',
    meaning: 'What a containing organism creates around its children.',
    neverCallIt: 'scope, context, namespace',
  },
  {
    term: 'vitality',
    meaning: 'Observable property derived from recent activity. Determines rendering prominence.',
    neverCallIt: 'activity score, engagement metric',
  },
  {
    term: 'dormant',
    meaning: 'An organism with sustained zero vitality. Not dead. Can be reawakened.',
    neverCallIt: 'archived, inactive, deleted',
  },
];

const interactionTerms: VocabEntry[] = [
  {
    term: 'threshold',
    meaning: 'The act of introducing something to the platform. Assuming stewardship.',
    neverCallIt: 'upload, create, register',
  },
  {
    term: 'proposal',
    meaning: 'An offered new state for an organism. Subject to regulatory evaluation.',
    neverCallIt: 'pull request, PR, merge request, edit',
  },
  {
    term: 'integrate',
    meaning: "To accept a proposal. The organism's state advances.",
    neverCallIt: 'merge, approve, accept',
  },
  {
    term: 'decline',
    meaning: "To reject a proposal. The organism's state remains.",
    neverCallIt: 'reject, deny, close',
  },
  {
    term: 'tend',
    meaning: "The ongoing act of maintaining an organism's coherence.",
    neverCallIt: 'manage, maintain, admin',
  },
  {
    term: 'fork',
    meaning: 'Copying an organism across boundaries. Independent with preserved lineage.',
    neverCallIt: 'clone, duplicate',
  },
  {
    term: 'surface',
    meaning: 'To place an organism on a map with coordinates. A curatorial act.',
    neverCallIt: 'publish, display, show',
  },
  {
    term: 'open-trunk',
    meaning: 'Configuration allowing direct state changes without proposals.',
    neverCallIt: 'unprotected, public edit',
  },
];

const structureTerms: VocabEntry[] = [
  {
    term: 'infrastructure',
    meaning: 'The physics. Eight concerns that make organisms possible.',
    neverCallIt: 'platform, framework, backend',
  },
  {
    term: 'content type',
    meaning: 'A contract: schema, renderer, differ, validator, optional evaluator. Lives on the state.',
    neverCallIt: 'file type, format, kind',
  },
  {
    term: 'relationship',
    meaning: 'Connective tissue between people and organisms. Not organisms.',
    neverCallIt: 'link, association',
  },
  {
    term: 'rendering',
    meaning: 'The perceptual interface. How organisms become visible.',
    neverCallIt: 'UI, frontend, view',
  },
  {
    term: 'universal layer',
    meaning: 'Consistent affordances on every organism. History, composition, governance.',
    neverCallIt: 'detail view, inspector',
  },
  {
    term: 'systems view',
    meaning: 'Dedicated composition interface for structural work.',
    neverCallIt: 'admin panel, settings, config',
  },
  {
    term: 'content-type renderer',
    meaning: 'The specific visual interface for a given content type.',
    neverCallIt: 'component, widget',
  },
];

const peopleTerms: VocabEntry[] = [
  {
    term: 'user',
    meaning: 'A person. Infrastructure, not an organism.',
    neverCallIt: 'member (without context), account',
  },
  { term: 'founder', meaning: 'The user with full authority over a community organism.', neverCallIt: 'owner, admin' },
  {
    term: 'member',
    meaning: 'A user with membership in a community organism.',
    neverCallIt: 'contributor, collaborator',
  },
  {
    term: 'integrator',
    meaning: 'A user assigned to hold the regulatory function for a specific organism.',
    neverCallIt: 'reviewer, maintainer, approver',
  },
  {
    term: 'steward',
    meaning: 'Anyone who has assumed responsibility for tending an organism.',
    neverCallIt: 'owner, creator, manager',
  },
];

function VocabTable({ title, entries }: { title: string; entries: VocabEntry[] }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2>{title}</h2>
      <table className="docs-table">
        <thead>
          <tr>
            <th>Term</th>
            <th>Meaning</th>
            <th>Never call it</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.term}>
              <td>
                <strong style={{ color: 'var(--accent)' }}>{e.term}</strong>
              </td>
              <td>{e.meaning}</td>
              <td style={{ color: '#f87171', fontSize: 12 }}>{e.neverCallIt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Vocabulary() {
  return (
    <div className="docs-section">
      <h1>Controlled Vocabulary</h1>
      <p className="docs-lead">
        These terms have precise meanings. Use them exactly as written — in code, file names, variable names, comments,
        and conversation. No synonyms.
      </p>

      <VocabTable title="The Primitive" entries={primitiveTerms} />
      <VocabTable title="Interactions" entries={interactionTerms} />
      <VocabTable title="System Structure" entries={structureTerms} />
      <VocabTable title="People" entries={peopleTerms} />
    </div>
  );
}
