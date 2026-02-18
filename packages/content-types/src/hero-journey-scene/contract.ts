import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateHeroJourneyScene } from './validator.js';

export const heroJourneySceneContentType: ContentTypeContract = {
  typeId: 'hero-journey-scene' as ContentTypeId,
  validate: validateHeroJourneyScene,
};
