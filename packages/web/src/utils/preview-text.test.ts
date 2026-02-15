import { describe, expect, it } from 'vitest';
import { getPreviewText } from './preview-text.js';

describe('getPreviewText', () => {
  it('returns "No state" for undefined input', () => {
    expect(getPreviewText(undefined)).toBe('No state');
  });

  it('returns "No state" for null input', () => {
    expect(getPreviewText(null)).toBe('No state');
  });

  it('extracts text content for text organisms', () => {
    const state = { contentTypeId: 'text', payload: { content: 'Hello world', format: 'plaintext' } };
    expect(getPreviewText(state)).toBe('Hello world');
  });

  it('truncates long text content at the default limit', () => {
    const long = 'a'.repeat(100);
    const state = { contentTypeId: 'text', payload: { content: long, format: 'plaintext' } };
    expect(getPreviewText(state)).toBe(`${'a'.repeat(60)}...`);
  });

  it('truncates at a custom limit', () => {
    const state = { contentTypeId: 'text', payload: { content: 'Hello wonderful world', format: 'plaintext' } };
    expect(getPreviewText(state, 5)).toBe('Hello...');
  });

  it('returns "Empty" for text organisms with empty content', () => {
    const state = { contentTypeId: 'text', payload: { content: '', format: 'plaintext' } };
    expect(getPreviewText(state)).toBe('Empty');
  });

  it('extracts name from payload', () => {
    const state = { contentTypeId: 'audio', payload: { name: 'My Song' } };
    expect(getPreviewText(state)).toBe('My Song');
  });

  it('extracts title from payload when no name', () => {
    const state = { contentTypeId: 'image', payload: { title: 'Sunset Photo' } };
    expect(getPreviewText(state)).toBe('Sunset Photo');
  });

  it('prefers name over title', () => {
    const state = { contentTypeId: 'audio', payload: { name: 'Track Name', title: 'Track Title' } };
    expect(getPreviewText(state)).toBe('Track Name');
  });

  it('falls back to content type label for unknown payloads', () => {
    const state = { contentTypeId: 'spatial-map', payload: { entries: [] } };
    expect(getPreviewText(state)).toBe('spatial-map organism');
  });

  it('handles non-object payload gracefully', () => {
    const state = { contentTypeId: 'text', payload: 'just a string' };
    expect(getPreviewText(state)).toBe('text organism');
  });
});
