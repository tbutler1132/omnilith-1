import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateHeroJourneyStage } from './validator.js';

export const heroJourneyStageContentType: ContentTypeContract = {
  typeId: 'hero-journey-stage' as ContentTypeId,
  validate: validateHeroJourneyStage,
};
