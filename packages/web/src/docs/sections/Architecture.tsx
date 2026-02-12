/**
 * Architecture — three zones, dependency rules, and the package map.
 *
 * Explains the kernel/plugins/adapters layering and the hard rules
 * that keep the architecture clean.
 */

import { ZoneDiagram } from '../diagrams/ZoneDiagram.js';

export function Architecture() {
  return (
    <div className="docs-section">
      <h1>Architecture</h1>
      <p className="docs-lead">
        Two layers. The system is infrastructure + app. The infrastructure is the
        physics — universal operations on organisms. The app is a specific
        configuration of organisms with specific content types and rendering.
      </p>

      {/* Zone Diagram */}
      <h2>Three Zones</h2>
      <ZoneDiagram />

      {/* Package Map */}
      <h2>Package Map</h2>
      <div className="docs-card-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="docs-card" style={{ borderTopColor: 'var(--accent)' }}>
          <h3>
            <code className="docs-code">kernel</code>
          </h3>
          <p>
            Pure TypeScript, zero dependencies. The organism primitive, eight
            infrastructure operations, content type contract, port interfaces.
            Like an OS kernel that manages organisms the way an OS manages processes.
          </p>
        </div>
        <div className="docs-card" style={{ borderTopColor: 'var(--amber)' }}>
          <h3>
            <code className="docs-code">content-types</code>
          </h3>
          <p>
            Plugin implementations. Each type registers a schema, validator, and
            optional evaluator. Like device drivers that teach the kernel how to
            handle specific kinds of data. Depends only on kernel contracts.
          </p>
        </div>
        <div className="docs-card" style={{ borderTopColor: 'var(--text-dim)' }}>
          <h3>
            <code className="docs-code">api</code>
          </h3>
          <p>
            HTTP adapter. Implements storage ports (PostgreSQL, object storage).
            Exposes kernel operations as endpoints. Thin translation layer between
            HTTP and domain.
          </p>
        </div>
        <div className="docs-card" style={{ borderTopColor: 'var(--green)' }}>
          <h3>
            <code className="docs-code">web</code>
          </h3>
          <p>
            React + Vite. Content-type renderers and differs. Universal layer,
            systems view. Calls the API, never touches the kernel directly.
          </p>
        </div>
      </div>

      {/* Hard Rules */}
      <h2>Hard Rules</h2>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '20px 24px',
      }}>
        <ul className="docs-rules-list">
          <li>
            <code className="docs-code">kernel/</code> imports nothing from any other package. Ever.
          </li>
          <li>
            <code className="docs-code">content-types/</code> imports only contracts and interfaces from kernel. Never concrete implementations.
          </li>
          <li>
            <code className="docs-code">api/</code> imports from kernel. Implements outbound ports (storage, event persistence).
          </li>
          <li>
            <code className="docs-code">web/</code> imports content-type renderers and calls the API. Never touches the kernel directly.
          </li>
          <li>
            New capabilities enter through <code className="docs-code">content-types/</code>, never through kernel modifications.
          </li>
          <li>
            Never add special-case code to the kernel for a specific content type.
          </li>
        </ul>
      </div>

      {/* Stack */}
      <h2>Stack</h2>
      <div className="docs-card-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        {[
          { label: 'Language', value: 'TypeScript' },
          { label: 'HTTP', value: 'Hono' },
          { label: 'Database', value: 'PostgreSQL + Drizzle' },
          { label: 'Frontend', value: 'React 19 + Vite' },
          { label: 'Testing', value: 'Vitest' },
          { label: 'Monorepo', value: 'pnpm workspaces' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '12px 16px',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {item.label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginTop: 2 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
