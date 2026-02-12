/**
 * Test helpers — factory functions for creating test data with sensible defaults.
 */

import type {
  OrganismId,
  UserId,
  StateId,
  ProposalId,
  ContentTypeId,
  EventId,
  RelationshipId,
  Timestamp,
  IdentityGenerator,
} from '../identity.js';
import type { ContentTypeContract, ValidationResult } from '../content-types/content-type-contract.js';

let counter = 0;

function nextId(prefix: string): string {
  counter++;
  return `${prefix}-${counter}`;
}

export function resetIdCounter(): void {
  counter = 0;
}

export function createTestIdentityGenerator(): IdentityGenerator {
  return {
    organismId: () => nextId('org') as OrganismId,
    userId: () => nextId('usr') as UserId,
    stateId: () => nextId('st') as StateId,
    proposalId: () => nextId('prop') as ProposalId,
    eventId: () => nextId('evt') as EventId,
    relationshipId: () => nextId('rel') as RelationshipId,
    timestamp: () => Date.now() as Timestamp,
  };
}

export function testUserId(id?: string): UserId {
  return (id ?? nextId('usr')) as UserId;
}

export function testOrganismId(id?: string): OrganismId {
  return (id ?? nextId('org')) as OrganismId;
}

export function testContentTypeId(id?: string): ContentTypeId {
  return (id ?? 'test-type') as ContentTypeId;
}

export function testTimestamp(ms?: number): Timestamp {
  return (ms ?? Date.now()) as Timestamp;
}

export function createPassthroughContentType(typeId?: string): ContentTypeContract {
  return {
    typeId: (typeId ?? 'test-type') as ContentTypeId,
    validate: (): ValidationResult => ({ valid: true, issues: [] }),
  };
}

export function createRejectingContentType(typeId?: string): ContentTypeContract {
  return {
    typeId: (typeId ?? 'test-type') as ContentTypeId,
    validate: (): ValidationResult => ({
      valid: false,
      issues: ['Rejected by test content type'],
    }),
  };
}
