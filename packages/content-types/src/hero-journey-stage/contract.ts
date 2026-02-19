/**
 * HeroJourneyStage content type contract.
 *
 * Registers the hero-journey-stage content type so organism state with this
 * payload shape can be validated and rendered through the registry.
 */

import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateHeroJourneyStage } from './validator.js';

export const heroJourneyStageContentType: ContentTypeContract = {
  typeId: 'hero-journey-stage' as ContentTypeId,
  validate: validateHeroJourneyStage,
};
