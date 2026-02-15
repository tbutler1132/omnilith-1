/**
 * Renderer registration — registers all content-type renderers at startup.
 */

export { FallbackRenderer } from './fallback.js';
export { getRenderer } from './registry.js';

import { AudioRenderer } from './audio.js';
import { CompositionReferenceRenderer } from './composition-reference.js';
import { ImageRenderer } from './image.js';
import { registerRenderer } from './registry.js';
import { TextRenderer } from './text.js';

export function registerAllRenderers() {
  registerRenderer('text', TextRenderer);
  registerRenderer('audio', AudioRenderer);
  registerRenderer('image', ImageRenderer);
  registerRenderer('composition-reference', CompositionReferenceRenderer);
}
