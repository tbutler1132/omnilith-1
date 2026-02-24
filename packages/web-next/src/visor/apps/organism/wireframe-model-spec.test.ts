import { describe, expect, it } from 'vitest';
import { resolveWireframeModelSpec } from './wireframe-model-spec.js';

describe('resolveWireframeModelSpec', () => {
  it('returns a registered model for text organisms', () => {
    const spec = resolveWireframeModelSpec('text');

    expect(spec.geometryKind).toBe('icosahedron');
    expect(spec.colorHex).toBe(0x8ccfff);
    expect(spec.rotationSpeedY).toBeGreaterThan(0);
  });

  it('returns a registered model for policy organisms', () => {
    const spec = resolveWireframeModelSpec('sensor');

    expect(spec.geometryKind).toBe('icosahedron');
    expect(spec.colorHex).toBe(0x9ad7ff);
    expect(spec.rotationSpeedY).toBeGreaterThan(0);
  });

  it('returns a registered model for creative organisms', () => {
    const spec = resolveWireframeModelSpec('song');

    expect(spec.geometryKind).toBe('icosahedron');
    expect(spec.colorHex).toBe(0xffbe86);
    expect(spec.rotationSpeedY).toBeGreaterThan(0);
  });

  it('returns fallback model for unknown content types', () => {
    const spec = resolveWireframeModelSpec('not-registered');

    expect(spec.geometryKind).toBe('box');
    expect(spec.colorHex).toBe(0x91abc8);
    expect(spec.rotationSpeedY).toBeGreaterThan(0);
  });

  it('requires exact content-type id matches', () => {
    const spec = resolveWireframeModelSpec('Text');

    expect(spec.geometryKind).toBe('box');
    expect(spec.colorHex).toBe(0x91abc8);
  });

  it('returns fallback model when content type is null', () => {
    const spec = resolveWireframeModelSpec(null);

    expect(spec.geometryKind).toBe('box');
    expect(spec.colorHex).toBe(0x91abc8);
  });
});
