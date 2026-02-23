/**
 * Main entrypoint for web-next rendering.
 *
 * Boots the minimal Space + closed Visor HUD shell so the rebuild can
 * iterate in slices without coupling to legacy web internals.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PlatformShell } from './platform/platform-shell.js';
import './styles.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}

createRoot(container).render(
  <StrictMode>
    <PlatformShell />
  </StrictMode>,
);
