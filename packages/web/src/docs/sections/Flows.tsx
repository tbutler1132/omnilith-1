/**
 * Flows — proposal evaluation and the cybernetic loop.
 *
 * The two key flows that emerge from composition: how proposals
 * get evaluated by policy organisms, and how feedback loops form.
 */

import { CyberneticLoopDiagram } from '../diagrams/CyberneticLoopDiagram.js';
import { ProposalFlowDiagram } from '../diagrams/ProposalFlowDiagram.js';

export function Flows() {
  return (
    <div className="docs-section">
      <h1>Flows</h1>
      <p className="docs-lead">
        The kernel provides simple operations. Complex behavior emerges from how organisms are composed. These two flows
        are the most important patterns.
      </p>

      {/* Proposal Evaluation */}
      <h2>Proposal Evaluation</h2>
      <p>
        When a proposal arrives for an organism, the infrastructure checks whether that organism contains any policy
        children. If it does, each policy evaluates the proposal. All must pass for the proposal to be integrated.
      </p>

      <ProposalFlowDiagram />

      <div className="docs-card-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginTop: 8 }}>
        <div className="docs-card" style={{ borderTopColor: 'var(--accent)' }}>
          <h3>No policies</h3>
          <p>
            An organism with no policy children is open. State changes are unrestricted — anyone with access can append
            state.
          </p>
        </div>
        <div className="docs-card" style={{ borderTopColor: 'var(--amber)' }}>
          <h3>With policies</h3>
          <p>
            Policy organisms inside a parent create regulation. Integration policy requires a designated integrator.
            Response policy reacts to variable thresholds.
          </p>
        </div>
        <div className="docs-card" style={{ borderTopColor: 'var(--green)' }}>
          <h3>Open-trunk</h3>
          <p>
            Bypasses evaluation entirely. Used for threads and other append-only organisms where friction would be
            harmful.
          </p>
        </div>
      </div>

      {/* Cybernetic Loop */}
      <h2>The Cybernetic Loop</h2>
      <p>
        When sensor, variable, and response policy organisms are composed inside a parent, a feedback loop emerges. The
        organism becomes self-regulating — aware of its own state and responsive to change.
      </p>

      <CyberneticLoopDiagram />

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '20px 24px',
          marginTop: 8,
        }}
      >
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          How it works
        </h3>
        <ol
          style={{
            listStyle: 'none',
            counterReset: 'step',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: 0,
          }}
        >
          {[
            {
              label: 'Sensor',
              text: 'observes a target organism and records readings (state changes, proposals, compositions).',
            },
            {
              label: 'Variable',
              text: "computes a derived value from sensor readings. Carries thresholds for what's normal.",
            },
            {
              label: 'Response Policy',
              text: 'watches a variable. When a threshold is crossed, it evaluates proposals to the parent accordingly.',
            },
            { label: 'Parent', text: "state changes (or doesn't) based on the response policy's evaluation." },
            {
              label: 'Events',
              text: 'are emitted for every mutation, and the sensor picks them up — closing the loop.',
            },
          ].map((step) => (
            <li key={step.label} style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--green)' }}>{step.label}</strong> {step.text}
            </li>
          ))}
        </ol>
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-dim)',
            marginTop: 12,
            borderTop: '1px solid var(--border)',
            paddingTop: 12,
          }}
        >
          No special wiring is needed. The loop emerges entirely from composing the right organisms together inside a
          parent. The infrastructure treats them as ordinary organisms — it doesn't know about "cybernetic loops."
        </p>
      </div>
    </div>
  );
}
