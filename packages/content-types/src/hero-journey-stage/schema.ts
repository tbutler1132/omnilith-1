/**
 * Hero Journey Stage content type — one narrative stage in an arc.
 *
 * Stage organisms are composed inside a hero-journey scene organism and
 * hold stage narrative intent. Candidate songs are modeled as composed
 * composition-reference children under each stage.
 */

export interface HeroJourneyStagePayload {
  readonly stageId: string;
  readonly phase: string;
  readonly title: string;
  readonly summary: string;
  readonly accentColor?: string;
}
