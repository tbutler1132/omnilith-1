/**
 * Marker profile resolver — optional semantic marker styling beyond content type.
 *
 * Uses existing organism metadata (name + content type) to assign
 * visual profiles for key domain concepts without introducing new
 * content types.
 */

export type MarkerProfile = 'institution' | 'system' | 'regulation';

interface MarkerProfileInput {
  name: string;
  contentTypeId: string;
}

export function resolveMarkerProfile(input: MarkerProfileInput): MarkerProfile | undefined {
  if (isRegulationContentType(input.contentTypeId)) {
    return 'regulation';
  }

  if (input.contentTypeId === 'composition-reference' && input.name.startsWith('Capital ')) {
    return 'institution';
  }

  if (input.contentTypeId === 'composition-reference' && input.name === 'Software System') {
    return 'system';
  }

  return undefined;
}

function isRegulationContentType(contentTypeId: string): boolean {
  return (
    contentTypeId === 'sensor' ||
    contentTypeId === 'variable' ||
    contentTypeId === 'response-policy' ||
    contentTypeId === 'action'
  );
}
