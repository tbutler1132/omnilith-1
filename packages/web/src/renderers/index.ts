/**
 * Renderer registration — registers all content-type renderers at startup.
 */

export { FallbackRenderer } from './fallback.js';
export { getRenderer } from './registry.js';

import { AudioRenderer } from './audio.js';
import { CommunityRenderer } from './community.js';
import { CompositionReferenceRenderer } from './composition-reference.js';
import { DawProjectRenderer } from './daw-project.js';
import { ImageRenderer } from './image.js';
import { registerRenderer } from './registry.js';
import { SongRenderer } from './song.js';
import { StemsBundleRenderer } from './stems-bundle.js';
import { TextRenderer } from './text.js';

export function registerAllRenderers() {
  registerRenderer('text', TextRenderer);
  registerRenderer('audio', AudioRenderer);
  registerRenderer('image', ImageRenderer);
  registerRenderer('composition-reference', CompositionReferenceRenderer);
  registerRenderer('community', CommunityRenderer);
  registerRenderer('song', SongRenderer);
  registerRenderer('daw-project', DawProjectRenderer);
  registerRenderer('stems-bundle', StemsBundleRenderer);
}
