/**
 * Overview — the organism model, four categories, and identity threshold.
 *
 * The entry point for understanding Omnilith. Explains the single
 * primitive, the complete ontology, and how things enter the system.
 */

import { CategoryDiagram } from '../diagrams/CategoryDiagram.js';

export function Overview() {
  return (
    <div className="docs-section">
      <h1>Overview</h1>
      <p className="docs-lead">
        Omnilith is built on a single primitive — the organism — and a thin
        infrastructure layer that makes organisms possible. Everything above
        the infrastructure is organisms composed of organisms.
      </p>

      {/* The Organism */}
      <h2>The Organism</h2>
      <p>
        The organism is the single primitive. Everything on the platform —
        creative works, communities, governance policies, sensors, maps,
        economic models — is an organism. An organism has exactly three properties:
      </p>

      <div className="docs-card-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="docs-card" style={{ borderTopColor: 'var(--accent)' }}>
          <h3>Identity</h3>
          <p>Persistent reference that endures through change. An organism is the same organism across every state it has ever had.</p>
        </div>
        <div className="docs-card" style={{ borderTopColor: 'var(--green)' }}>
          <h3>State</h3>
          <p>Immutable snapshots with history. Each state is self-describing — it carries its own content type and payload. Content type lives on the state, not the organism.</p>
        </div>
        <div className="docs-card" style={{ borderTopColor: 'var(--amber)' }}>
          <h3>Composition</h3>
          <p>Can contain and be contained by other organisms. Containment creates a boundary. Higher-order behavior emerges from composition.</p>
        </div>
      </div>

      {/* Four Categories */}
      <h2>Four Categories</h2>
      <p>
        The complete ontology. Everything in the system is exactly one of these
        categories. Nothing spans categories.
      </p>

      <CategoryDiagram />

      {/* Identity Threshold */}
      <h2>The Identity Threshold</h2>
      <p>
        The threshold is how things enter the system. It is a three-phase process —
        intentional but lightweight.
      </p>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        justifyContent: 'center',
        margin: '24px 0',
        flexWrap: 'wrap',
      }}>
        <ThresholdPhase
          number={1}
          title="Coherence is perceived"
          description="Outside the system. Someone recognizes that something has enough identity to deserve a persistent reference."
          color="var(--text-dim)"
        />
        <PhaseArrow />
        <ThresholdPhase
          number={2}
          title="Stewardship is assumed"
          description="The threshold act. Someone commits to tending this thing — introducing it to the platform."
          color="var(--accent)"
        />
        <PhaseArrow />
        <ThresholdPhase
          number={3}
          title="Identity is maintained"
          description="Ongoing life through regulatory activity. State changes, proposals, composition — the organism lives."
          color="var(--green)"
        />
      </div>

      {/* Emergence */}
      <h2>Emergence Through Composition</h2>
      <p>
        Higher-order behavior arises from composing simple organisms together.
        Regulation is not built into the primitive — it emerges when policy
        organisms are composed inside a parent. Cybernetic behavior emerges
        when sensor, variable, prediction, and response policy organisms are
        composed together inside a parent.
      </p>
      <p>
        This is the central design principle: the infrastructure provides a
        simple, universal primitive, and all specificity lives in content types
        and composition patterns.
      </p>
    </div>
  );
}

function ThresholdPhase({
  number,
  title,
  description,
  color,
}: {
  number: number;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${color}`,
      borderRadius: 10,
      padding: '16px 18px',
      width: 200,
      flexShrink: 0,
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: 4,
      }}>Phase {number}</div>
      <div style={{
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--text)',
        marginBottom: 6,
      }}>{title}</div>
      <div style={{
        fontSize: 12,
        color: 'var(--text-dim)',
        lineHeight: 1.5,
      }}>{description}</div>
    </div>
  );
}

function PhaseArrow() {
  return (
    <svg width="32" height="20" style={{ flexShrink: 0 }}>
      <defs>
        <marker
          id="phase-arrow"
          viewBox="0 0 10 7"
          refX="10"
          refY="3.5"
          markerWidth="8"
          markerHeight="6"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--text-dim)" />
        </marker>
      </defs>
      <line x1="2" y1="10" x2="22" y2="10" stroke="var(--text-dim)" strokeWidth="1.5" markerEnd="url(#phase-arrow)" />
    </svg>
  );
}
