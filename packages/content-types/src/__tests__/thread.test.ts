import { describe, expect, it } from 'vitest';
import { validateThread } from '../thread/validator.js';

describe('thread content type', () => {
  it('a thread is created with a title', () => {
    const result = validateThread({
      title: 'Album Discussion',
      appendOnly: true,
    });
    expect(result.valid).toBe(true);
  });

  it('a thread can have a linked organism', () => {
    const result = validateThread({
      title: 'Discussion about this song',
      linkedOrganismId: 'org-123',
      appendOnly: true,
    });
    expect(result.valid).toBe(true);
  });

  it('posts are state appends with structured payloads', () => {
    const result = validateThread({
      author: 'usr-1',
      content: 'I think we should revisit the bridge section.',
      timestamp: Date.now(),
    });
    expect(result.valid).toBe(true);
  });

  it('posts require an author', () => {
    const result = validateThread({
      author: '',
      content: 'Some text',
      timestamp: Date.now(),
    });
    expect(result.valid).toBe(false);
  });

  it('thread title cannot be empty', () => {
    const result = validateThread({
      title: '',
      appendOnly: true,
    });
    expect(result.valid).toBe(false);
  });
});
