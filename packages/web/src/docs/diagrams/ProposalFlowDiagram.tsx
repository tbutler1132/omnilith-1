/**
 * ProposalFlowDiagram — linear flow of proposal evaluation.
 *
 * Proposal opened → find policy children → evaluate each →
 * all pass (integrate) or any decline (decline).
 */

export function ProposalFlowDiagram() {
  return (
    <div className="docs-diagram" style={{ padding: '24px 0' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        flexWrap: 'wrap',
      }}>
        <FlowBox label="Proposal Opened" color="var(--accent)" />
        <FlowArrow />
        <FlowBox label="Find Policy Children" color="var(--text-dim)" />
        <FlowArrow />
        <FlowBox label="Evaluate Each" color="var(--amber)" />
        <FlowArrow />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FlowBox label="All Pass → Integrate" color="var(--green)" />
          <FlowBox label="Any Decline → Decline" color="#f87171" />
        </div>
      </div>

      <div style={{
        marginTop: 20,
        padding: '14px 18px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        maxWidth: 520,
        margin: '20px auto 0',
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text)' }}>No policy children?</strong> The organism is open — state changes are unrestricted.
          <br />
          <strong style={{ color: 'var(--text)' }}>Open-trunk?</strong> Bypasses proposal evaluation entirely. Any authorized user can append state directly.
        </div>
      </div>
    </div>
  );
}

function FlowBox({ label, color }: { label: string; color: string }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${color}`,
      borderRadius: 8,
      padding: '10px 16px',
      fontSize: 13,
      fontWeight: 500,
      color,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </div>
  );
}

function FlowArrow() {
  return (
    <svg width="32" height="20" style={{ flexShrink: 0 }}>
      <defs>
        <marker
          id="flow-arrow"
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
      <line x1="2" y1="10" x2="22" y2="10" stroke="var(--text-dim)" strokeWidth="1.5" markerEnd="url(#flow-arrow)" />
    </svg>
  );
}
