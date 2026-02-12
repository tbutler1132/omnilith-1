/**
 * ZoneDiagram — three concentric zones of the architecture.
 *
 * Kernel at center (pure domain), plugins around it, adapters at edge.
 * Arrows point inward only — adapters depend on kernel, never reverse.
 */

export function ZoneDiagram() {
  return (
    <div className="docs-diagram" style={{ padding: '32px 0' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Outer: Adapters */}
        <div
          style={{
            width: 420,
            height: 300,
            borderRadius: 16,
            border: '2px solid var(--border)',
            background: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 10,
              left: 16,
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--text-dim)',
            }}
          >
            Adapters
          </span>
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 16,
              fontSize: 10,
              color: 'var(--text-dim)',
              opacity: 0.6,
            }}
          >
            api / web
          </div>

          {/* Middle: Plugins */}
          <div
            style={{
              width: 300,
              height: 200,
              borderRadius: 12,
              border: '2px solid var(--amber)',
              background: 'rgba(251, 191, 36, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 8,
                left: 14,
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--amber)',
              }}
            >
              Plugins
            </span>
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 14,
                fontSize: 10,
                color: 'var(--amber)',
                opacity: 0.6,
              }}
            >
              content-types
            </div>

            {/* Inner: Kernel */}
            <div
              style={{
                width: 180,
                height: 100,
                borderRadius: 8,
                border: '2px solid var(--accent)',
                background: 'rgba(124, 108, 240, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--accent)',
                  letterSpacing: '0.3px',
                }}
              >
                Kernel
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--text-dim)',
                  marginTop: 2,
                }}
              >
                zero dependencies
              </span>
            </div>
          </div>

          {/* Arrows pointing inward */}
          <svg width="420" height="300" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
            <title>Zone dependency arrows</title>
            <defs>
              <marker
                id="arrow-in"
                viewBox="0 0 10 7"
                refX="10"
                refY="3.5"
                markerWidth="8"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--text-dim)" />
              </marker>
            </defs>
            {/* Left arrow: adapter → plugins */}
            <line
              x1="30"
              y1="150"
              x2="57"
              y2="150"
              stroke="var(--text-dim)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              markerEnd="url(#arrow-in)"
            />
            {/* Right arrow: adapter → plugins */}
            <line
              x1="390"
              y1="150"
              x2="363"
              y2="150"
              stroke="var(--text-dim)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              markerEnd="url(#arrow-in)"
            />
            {/* Bottom arrow: adapter → kernel (skip plugins) */}
            <line
              x1="210"
              y1="280"
              x2="210"
              y2="253"
              stroke="var(--text-dim)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              markerEnd="url(#arrow-in)"
            />
          </svg>
        </div>
      </div>

      <p
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--text-dim)',
          marginTop: 16,
        }}
      >
        Dependencies point inward. The kernel imports nothing. Adapters implement kernel ports.
      </p>
    </div>
  );
}
