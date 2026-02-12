/**
 * Renderer registration — registers all content-type renderers at startup.
 */

export { FallbackRenderer } from './fallback.js';
export { getRenderer } from './registry.js';

import { registerRenderer } from './registry.js';
import { TextRenderer } from './text.js';

export function registerAllRenderers() {
  registerRenderer('text', TextRenderer);
}
