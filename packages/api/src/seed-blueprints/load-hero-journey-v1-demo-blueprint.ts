/**
 * Hero's Journey v1 demo blueprint loader.
 *
 * Keeps seed content in JSON so song/stage structure can be edited without
 * changing seed orchestration code.
 */

import { readFile } from 'node:fs/promises';
import type { HeroJourneyBlueprint } from '../seed-helpers/hero-journey.js';

const HERO_JOURNEY_V1_DEMO_BLUEPRINT_URL = new URL('./hero-journey-v1-demo.json', import.meta.url);

function assertIsRecord(value: unknown, message: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }
}

function assertIsArray(value: unknown, message: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(message);
  }
}

export async function loadHeroJourneyV1DemoBlueprint(): Promise<HeroJourneyBlueprint> {
  const raw = await readFile(HERO_JOURNEY_V1_DEMO_BLUEPRINT_URL, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  assertIsRecord(parsed, 'Hero Journey blueprint must be an object');
  assertIsArray(parsed.songs, 'Hero Journey blueprint must include songs[]');
  assertIsArray(parsed.stages, 'Hero Journey blueprint must include stages[]');
  return parsed as unknown as HeroJourneyBlueprint;
}
