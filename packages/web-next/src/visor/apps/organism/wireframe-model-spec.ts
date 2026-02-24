/**
 * Wireframe model spec resolver.
 *
 * Provides deterministic model settings for each content type so the
 * Organism app can preview a lightweight wireframe signature.
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

const TEXT_SPEC: WireframeModelSpec = {
  geometryKind: 'icosahedron',
  colorHex: 0x8ccfff,
  rotationSpeedY: 0.0024,
};

export function resolveWireframeModelSpec(contentTypeId: string | null): WireframeModelSpec {
  if (contentTypeId === 'text') {
    return TEXT_SPEC;
  }

  return FALLBACK_SPEC;
}
