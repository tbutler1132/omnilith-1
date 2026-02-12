/**
 * Thread content type — a conversation organism.
 *
 * Threads are organisms with open-trunk configuration. Posts are state
 * appends with structured payloads. A thread can optionally be linked
 * to another organism or proposal for context.
 */

import type { OrganismId, UserId, Timestamp } from '@omnilith/kernel';

export interface ThreadPayload {
  readonly title: string;
  readonly linkedOrganismId?: OrganismId;
  readonly appendOnly: boolean;
}

export interface ThreadPostPayload {
  readonly author: UserId;
  readonly content: string;
  readonly timestamp: Timestamp;
}
