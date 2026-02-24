/**
 * Wireframe model spec resolver.
 *
 * Provides deterministic model settings for each content type through
 * an exact-match registry so the Organism app can preview a lightweight
 * wireframe signature tied to specific content type ids.
 */

export type WireframeGeometryKind = 'box' | 'icosahedron';

export interface WireframeModelSpec {
  readonly geometryKind: WireframeGeometryKind;
  readonly colorHex: number;
  readonly rotationSpeedY: number;
}

const FALLBACK_SPEC: WireframeModelSpec = {
  geometryKind: 'box',
  colorHex: 0x91abc8,
  rotationSpeedY: 0.0018,
};

const WIREFRAME_MODEL_SPEC_REGISTRY: Readonly<Record<string, WireframeModelSpec>> = {
  text: {
    geometryKind: 'icosahedron',
    colorHex: 0x8ccfff,
    rotationSpeedY: 0.0024,
  },
  image: {
    geometryKind: 'box',
    colorHex: 0xc7b3ff,
    rotationSpeedY: 0.0015,
  },
  audio: {
    geometryKind: 'icosahedron',
    colorHex: 0x84e8ff,
    rotationSpeedY: 0.0021,
  },
  song: {
    geometryKind: 'icosahedron',
    colorHex: 0xffbe86,
    rotationSpeedY: 0.0019,
  },
  'stems-bundle': {
    geometryKind: 'box',
    colorHex: 0x9ddcff,
    rotationSpeedY: 0.0017,
  },
  'daw-project': {
    geometryKind: 'box',
    colorHex: 0xd9c6ff,
    rotationSpeedY: 0.0016,
  },
  community: {
    geometryKind: 'icosahedron',
    colorHex: 0xffd28e,
    rotationSpeedY: 0.0017,
  },
  thread: {
    geometryKind: 'box',
    colorHex: 0xa0c4e7,
    rotationSpeedY: 0.0016,
  },
  'spatial-map': {
    geometryKind: 'box',
    colorHex: 0x9de8cb,
    rotationSpeedY: 0.0014,
  },
  'composition-reference': {
    geometryKind: 'box',
    colorHex: 0xc4d7ff,
    rotationSpeedY: 0.0015,
  },
  'integration-policy': {
    geometryKind: 'box',
    colorHex: 0xff8f8f,
    rotationSpeedY: 0.0012,
  },
  'membership-policy': {
    geometryKind: 'box',
    colorHex: 0xffb27b,
    rotationSpeedY: 0.0012,
  },
  'visibility-policy': {
    geometryKind: 'box',
    colorHex: 0xffd493,
    rotationSpeedY: 0.0012,
  },
  sensor: {
    geometryKind: 'icosahedron',
    colorHex: 0x9ad7ff,
    rotationSpeedY: 0.0022,
  },
  variable: {
    geometryKind: 'box',
    colorHex: 0xa2bdfc,
    rotationSpeedY: 0.0014,
  },
  prediction: {
    geometryKind: 'icosahedron',
    colorHex: 0xc8b6ff,
    rotationSpeedY: 0.0019,
  },
  'response-policy': {
    geometryKind: 'box',
    colorHex: 0xff9f74,
    rotationSpeedY: 0.0013,
  },
  'hero-journey-scene': {
    geometryKind: 'icosahedron',
    colorHex: 0xffc995,
    rotationSpeedY: 0.0018,
  },
  'hero-journey-stage': {
    geometryKind: 'box',
    colorHex: 0xb4d1ff,
    rotationSpeedY: 0.0015,
  },
  'github-repository': {
    geometryKind: 'box',
    colorHex: 0xa9b6cb,
    rotationSpeedY: 0.0014,
  },
  'github-issue': {
    geometryKind: 'icosahedron',
    colorHex: 0xffa8a8,
    rotationSpeedY: 0.0019,
  },
};

export function resolveWireframeModelSpec(contentTypeId: string | null): WireframeModelSpec {
  return contentTypeId ? (WIREFRAME_MODEL_SPEC_REGISTRY[contentTypeId] ?? FALLBACK_SPEC) : FALLBACK_SPEC;
}
