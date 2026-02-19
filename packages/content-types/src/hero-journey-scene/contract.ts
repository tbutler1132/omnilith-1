/**
 * HeroJourneyScene content type contract.
 *
 * Registers the hero-journey-scene content type so organism state with this
 * payload shape can be validated and rendered through the registry.
 */

import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateHeroJourneyScene } from './validator.js';

export const heroJourneySceneContentType: ContentTypeContract = {
  typeId: 'hero-journey-scene' as ContentTypeId,
  validate: validateHeroJourneyScene,
};
