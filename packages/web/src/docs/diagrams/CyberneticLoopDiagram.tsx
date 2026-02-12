/**
 * CyberneticLoopDiagram — the feedback loop that emerges from composition.
 *
 * Sensor observes → Variable computes → Response Policy evaluates →
 * Parent organism is affected → Events are emitted → Sensor observes.
 * All through composing organisms inside a parent. No special wiring.
 */

const steps = [
  { label: 'Sensor', detail: 'Observes target organism', color: 'var(--green)' },
  { label: 'Variable', detail: 'Computes derived value', color: 'var(--green)' },
  { label: 'Response Policy', detail: 'Evaluates proposals', color: 'var(--amber)' },
  { label: 'Parent Organism', detail: 'State changes or not', color: 'var(--accent)' },
  { label: 'Events', detail: 'Mutations recorded', color: 'var(--text-dim)' },
];

export function CyberneticLoopDiagram() {
  const cx = 220;
  const cy = 170;
  const rx = 180;
  const ry = 130;

  return (
    <div className="docs-diagram" style={{ padding: '24px 0' }}>
      <div style={{ position: 'relative', width: 440, height: 340, margin: '0 auto' }}>
        <svg width="440" height="340" style={{ position: 'absolute', top: 0, left: 0 }}>
          <title>Cybernetic loop diagram</title>
          <defs>
            <marker
              id="loop-arrow"
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

          {/* Elliptical path arrows between nodes */}
          {steps.map((_, i) => {
            const angle1 = (i / steps.length) * 2 * Math.PI - Math.PI / 2;
            const angle2 = ((i + 1) / steps.length) * 2 * Math.PI - Math.PI / 2;
            const x1 = cx + rx * Math.cos(angle1);
            const y1 = cy + ry * Math.sin(angle1);
            const x2 = cx + rx * Math.cos(angle2);
            const y2 = cy + ry * Math.sin(angle2);
            // Midpoint offset for slight curve
            const midAngle = ((i + 0.5) / steps.length) * 2 * Math.PI - Math.PI / 2;
            const midX = cx + rx * 0.85 * Math.cos(midAngle);
            const midY = cy + ry * 0.85 * Math.sin(midAngle);

            // Shorten the line to not overlap with the boxes
            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            const shortenBy = 44;
            const sx = x1 + (dx / len) * shortenBy;
            const sy = y1 + (dy / len) * shortenBy;
            const ex = x2 - (dx / len) * shortenBy;
            const ey = y2 - (dy / len) * shortenBy;

            return (
              <path
                key={`arrow-${steps[i].label}`}
                d={`M ${sx} ${sy} Q ${midX} ${midY} ${ex} ${ey}`}
                fill="none"
                stroke="var(--border)"
                strokeWidth="1.5"
                markerEnd="url(#loop-arrow)"
              />
            );
          })}

          {/* Subtle animated pulse dot traveling the path */}
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="none" />
          <circle r="3" fill="var(--accent)" opacity="0.6">
            <animateMotion
              dur="6s"
              repeatCount="indefinite"
              path={`M ${cx} ${cy - ry} A ${rx} ${ry} 0 1 1 ${cx - 0.01} ${cy - ry}`}
            />
          </circle>
        </svg>

        {/* Node labels */}
        {steps.map((step, i) => {
          const angle = (i / steps.length) * 2 * Math.PI - Math.PI / 2;
          const x = cx + rx * Math.cos(angle);
          const y = cy + ry * Math.sin(angle);

          return (
            <div
              key={step.label}
              style={{
                position: 'absolute',
                left: x - 55,
                top: y - 22,
                width: 110,
                textAlign: 'center',
                background: 'var(--surface)',
                border: `1px solid ${step.color}`,
                borderRadius: 8,
                padding: '8px 6px',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: step.color }}>{step.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{step.detail}</div>
            </div>
          );
        })}
      </div>

      <p
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--text-dim)',
          maxWidth: 420,
          margin: '8px auto 0',
          lineHeight: 1.5,
        }}
      >
        The cybernetic loop emerges from composing sensor, variable, and response policy organisms inside a parent. No
        special wiring — just composition.
      </p>
    </div>
  );
}
