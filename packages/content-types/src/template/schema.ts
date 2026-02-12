/**
 * Template content type — a recipe for instantiating a composition of organisms.
 *
 * Templates describe a set of organisms to create and how to compose them.
 * Each step in the recipe specifies a content type, initial payload, and
 * optional composition relationship to another step.
 */

import type { ContentTypeId } from '@omnilith/kernel';

export interface TemplateRecipeStep {
  readonly ref: string;
  readonly contentTypeId: ContentTypeId;
  readonly initialPayload: unknown;
  readonly openTrunk?: boolean;
  readonly composeInto?: string;
  readonly position?: number;
}

export interface TemplatePayload {
  readonly name: string;
  readonly description: string;
  readonly recipe: ReadonlyArray<TemplateRecipeStep>;
}
