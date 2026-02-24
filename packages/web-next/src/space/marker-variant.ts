/**
 * Marker variant resolver for spatial-map organism markers.
 *
 * Preserves the visual icon language from the previous web package so
 * marker distinctions stay recognizable in the rewrite.
 */

export type MarkerVariant =
  | 'community'
  | 'song'
  | 'hero-journey-scene'
  | 'github-repository'
  | 'institution'
  | 'system'
  | 'regulation'
  | 'default';

interface MarkerVariantInput {
  readonly name: string;
  readonly contentTypeId: string | null;
}

const REGULATION_CONTENT_TYPES = new Set<string>([
  'sensor',
  'variable',
  'prediction',
  'action',
  'response-policy',
  'integration-policy',
  'membership-policy',
  'visibility-policy',
  'paywall-policy',
  'revenue-distribution-policy',
]);

function isRegulationContentType(contentTypeId: string): boolean {
  return REGULATION_CONTENT_TYPES.has(contentTypeId);
}

export function resolveMarkerVariant(input: MarkerVariantInput): MarkerVariant {
  if (!input.contentTypeId) {
    return 'default';
  }

  if (isRegulationContentType(input.contentTypeId)) {
    return 'regulation';
  }

  if (input.contentTypeId === 'composition-reference' && input.name.startsWith('Capital ')) {
    return 'institution';
  }

  if (input.contentTypeId === 'composition-reference' && input.name === 'Software System') {
    return 'system';
  }

  if (input.contentTypeId === 'community') {
    return 'community';
  }

  if (input.contentTypeId === 'song') {
    return 'song';
  }

  if (input.contentTypeId === 'hero-journey-scene') {
    return 'hero-journey-scene';
  }

  if (input.contentTypeId === 'github-repository') {
    return 'github-repository';
  }

  return 'default';
}
