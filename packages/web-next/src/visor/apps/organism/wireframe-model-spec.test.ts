import { describe, expect, it } from 'vitest';
import { resolveWireframeModelSpec } from './wireframe-model-spec.js';

describe('resolveWireframeModelSpec', () => {
  it('returns a text-specific model for text organisms', () => {
    const spec = resolveWireframeModelSpec('text');

    expect(spec.geometryKind).toBe('icosahedron');
    expect(spec.colorHex).toBe(0x8ccfff);
    expect(spec.rotationSpeedY).toBeGreaterThan(0);
  });

  it('returns fallback model for unknown content types', () => {
    const spec = resolveWireframeModelSpec('spatial-map');

    expect(spec.geometryKind).toBe('box');
    expect(spec.colorHex).toBe(0x91abc8);
    expect(spec.rotationSpeedY).toBeGreaterThan(0);
  });

  it('returns fallback model when content type is null', () => {
    const spec = resolveWireframeModelSpec(null);

    expect(spec.geometryKind).toBe('box');
    expect(spec.colorHex).toBe(0x91abc8);
  });
});
