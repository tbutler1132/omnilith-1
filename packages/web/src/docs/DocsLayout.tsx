/**
 * DocsLayout — two-column shell for interactive documentation.
 *
 * Fixed sidebar with navigation links, scrollable content pane
 * with nested routes for each section. Accessible without authentication.
 */

import { Navigate, NavLink, Route, Routes } from 'react-router';
import { Architecture } from './sections/Architecture.js';
import { ContentTypes } from './sections/ContentTypes.js';
import { Flows } from './sections/Flows.js';
import { Kernel } from './sections/Kernel.js';
import { Overview } from './sections/Overview.js';
import { Vocabulary } from './sections/Vocabulary.js';

const sections = [
  { path: 'overview', label: 'Overview' },
  { path: 'architecture', label: 'Architecture' },
  { path: 'kernel', label: 'Kernel' },
  { path: 'content-types', label: 'Content Types' },
  { path: 'flows', label: 'Flows' },
  { path: 'vocabulary', label: 'Vocabulary' },
];

export function DocsLayout() {
  return (
    <div className="docs-layout">
      <aside className="docs-sidebar">
        <div className="docs-sidebar-header">
          <div className="docs-logo">Omnilith</div>
          <div className="docs-subtitle">Documentation</div>
        </div>

        <a href="/" className="docs-back-link">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 6 }}>
            <title>Back</title>
            <path
              d="M9 11L5 7L9 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to app
        </a>

        <nav className="docs-nav">
          {sections.map((s) => (
            <NavLink
              key={s.path}
              to={`/docs/${s.path}`}
              className={({ isActive }) => `docs-nav-item${isActive ? ' docs-nav-item--active' : ''}`}
            >
              {s.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="docs-content">
        <Routes>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="architecture" element={<Architecture />} />
          <Route path="kernel" element={<Kernel />} />
          <Route path="content-types" element={<ContentTypes />} />
          <Route path="flows" element={<Flows />} />
          <Route path="vocabulary" element={<Vocabulary />} />
        </Routes>
      </main>
    </div>
  );
}
