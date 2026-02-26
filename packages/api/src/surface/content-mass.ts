/**
 * Typed content-mass extraction for surface size derivation.
 *
 * Converts content-type-specific payload signals into normalized mass units
 * so derived map size reflects meaningful content volume instead of raw bytes.
 */

import type { ContentTypeId } from '@omnilith/kernel';

function payloadByteLength(payload: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(payload), 'utf8');
  } catch {
    return 0;
  }
}

function asRecord(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  return payload as Record<string, unknown>;
}

function stringLength(value: unknown): number {
  return typeof value === 'string' ? value.length : 0;
}

function numberValue(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function arrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function resolveTextMass(payload: unknown): number {
  const record = asRecord(payload);
  const contentLength = stringLength(record.content);
  const metadataBytes = payloadByteLength(record.metadata);
  return Math.max(0.2, contentLength / 1600 + metadataBytes / 8000);
}

function resolveAudioMass(payload: unknown): number {
  const record = asRecord(payload);
  const durationSeconds = numberValue(record.durationSeconds) ?? 0;
  return Math.max(0.6, durationSeconds / 180);
}

function resolveImageMass(payload: unknown): number {
  const record = asRecord(payload);
  const width = numberValue(record.width) ?? 0;
  const height = numberValue(record.height) ?? 0;
  const megapixels = (width * height) / 1_000_000;
  return Math.max(0.4, Math.sqrt(Math.max(0, megapixels)));
}

function resolveCompositionReferenceMass(payload: unknown): number {
  const record = asRecord(payload);
  const entries = arrayLength(record.entries);
  return Math.max(0.5, 0.45 + entries * 0.25);
}

function resolveTemplateMass(payload: unknown): number {
  const record = asRecord(payload);
  const recipeLength = arrayLength(record.recipe);
  return Math.max(0.5, 0.6 + recipeLength * 0.35);
}

function resolveThreadMass(payload: unknown): number {
  const record = asRecord(payload);
  const titleLength = stringLength(record.title);
  return Math.max(0.4, 0.3 + titleLength / 220);
}

function resolveSongMass(payload: unknown): number {
  const record = asRecord(payload);
  const titleLength = stringLength(record.title);
  const notesLength = stringLength(record.notes);
  return Math.max(0.5, 0.6 + (titleLength + notesLength) / 320);
}

function resolveStemsBundleMass(payload: unknown): number {
  const record = asRecord(payload);
  const stemCount = numberValue(record.stemCount) ?? 0;
  return Math.max(0.6, 0.7 + stemCount * 0.16);
}

function resolveDawProjectMass(): number {
  return 1.3;
}

function resolveSpatialMapMass(payload: unknown): number {
  const record = asRecord(payload);
  const width = numberValue(record.width) ?? 0;
  const height = numberValue(record.height) ?? 0;
  const entries = arrayLength(record.entries);
  const areaUnits = Math.sqrt(Math.max(0, width * height) / (2000 * 2000));
  return Math.max(0.7, areaUnits + entries * 0.03);
}

function resolveGitHubIssueMass(payload: unknown): number {
  const record = asRecord(payload);
  const titleLength = stringLength(record.title);
  const bodyLength = stringLength(record.body);
  const labelsLength = arrayLength(record.labels);
  return Math.max(0.4, 0.4 + titleLength / 160 + bodyLength / 2200 + labelsLength * 0.08);
}

function resolveGitHubRepositoryMass(payload: unknown): number {
  const record = asRecord(payload);
  const ownerLength = stringLength(record.owner);
  const nameLength = stringLength(record.name);
  return Math.max(0.4, 0.45 + (ownerLength + nameLength) / 120);
}

function resolveSensorMass(payload: unknown): number {
  const record = asRecord(payload);
  const readingsLength = arrayLength(record.readings);
  return Math.max(0.4, 0.45 + readingsLength * 0.03);
}

function resolveVariableMass(payload: unknown): number {
  const record = asRecord(payload);
  const labelLength = stringLength(record.label);
  return Math.max(0.35, 0.35 + labelLength / 180);
}

function resolveResponsePolicyMass(payload: unknown): number {
  const record = asRecord(payload);
  const reasonLength = stringLength(record.reason);
  return Math.max(0.3, 0.35 + reasonLength / 320);
}

function resolveIntegrationPolicyMass(): number {
  return 0.5;
}

function resolveActionMass(payload: unknown): number {
  const record = asRecord(payload);
  const labelLength = stringLength(record.label);
  return Math.max(0.4, 0.45 + labelLength / 180);
}

function resolveHeroJourneySceneMass(payload: unknown): number {
  const record = asRecord(payload);
  const titleLength = stringLength(record.title);
  const chaptersLength = arrayLength(record.chapters);
  return Math.max(0.45, 0.4 + titleLength / 200 + chaptersLength * 0.2);
}

function resolveHeroJourneyStageMass(payload: unknown): number {
  const record = asRecord(payload);
  const titleLength = stringLength(record.title);
  const summaryLength = stringLength(record.summary);
  return Math.max(0.4, 0.35 + (titleLength + summaryLength) / 280);
}

function resolveCommunityMass(payload: unknown): number {
  const record = asRecord(payload);
  const descriptionLength = stringLength(record.description);
  return Math.max(0.45, 0.35 + descriptionLength / 220);
}

export function resolveTypedContentMass(contentTypeId: ContentTypeId, payload: unknown): number {
  switch (contentTypeId) {
    case 'text':
      return resolveTextMass(payload);
    case 'audio':
      return resolveAudioMass(payload);
    case 'image':
      return resolveImageMass(payload);
    case 'song':
      return resolveSongMass(payload);
    case 'stems-bundle':
      return resolveStemsBundleMass(payload);
    case 'daw-project':
      return resolveDawProjectMass();
    case 'thread':
      return resolveThreadMass(payload);
    case 'template':
      return resolveTemplateMass(payload);
    case 'composition-reference':
      return resolveCompositionReferenceMass(payload);
    case 'github-repository':
      return resolveGitHubRepositoryMass(payload);
    case 'github-issue':
      return resolveGitHubIssueMass(payload);
    case 'hero-journey-scene':
      return resolveHeroJourneySceneMass(payload);
    case 'hero-journey-stage':
      return resolveHeroJourneyStageMass(payload);
    case 'sensor':
      return resolveSensorMass(payload);
    case 'variable':
      return resolveVariableMass(payload);
    case 'response-policy':
      return resolveResponsePolicyMass(payload);
    case 'integration-policy':
      return resolveIntegrationPolicyMass();
    case 'action':
      return resolveActionMass(payload);
    case 'community':
      return resolveCommunityMass(payload);
    case 'spatial-map':
      return resolveSpatialMapMass(payload);
    default: {
      const bytes = payloadByteLength(payload);
      return Math.max(0.35, bytes / 3000);
    }
  }
}
