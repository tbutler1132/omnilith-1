/**
 * Hero Journey Scene content type — lightweight bespoke demo schema.
 *
 * This exists to let the V1 demo present a narrative concept-album scene
 * without introducing the full scene-authoring system yet.
 */

export interface HeroJourneyChapter {
  readonly stageId?: string;
  readonly phase: string;
  readonly title: string;
  readonly summary: string;
  readonly accentColor?: string;
}

export interface HeroJourneyScenePayload {
  readonly title: string;
  readonly subtitle?: string;
  readonly chapters?: ReadonlyArray<HeroJourneyChapter>;
}
