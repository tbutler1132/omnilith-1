/**
 * Identity — branded types for all identifiers in the system.
 *
 * Every entity in the kernel has a typed identifier that prevents
 * accidental mixing of IDs across domains. These are string-branded
 * types — structurally strings, but the type system prevents passing
 * an OrganismId where a UserId is expected.
 */

declare const brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [brand]: B };

export type OrganismId = Brand<string, 'OrganismId'>;
export type UserId = Brand<string, 'UserId'>;
export type StateId = Brand<string, 'StateId'>;
export type ProposalId = Brand<string, 'ProposalId'>;
export type ContentTypeId = Brand<string, 'ContentTypeId'>;
export type EventId = Brand<string, 'EventId'>;
export type RelationshipId = Brand<string, 'RelationshipId'>;
export type Timestamp = Brand<number, 'Timestamp'>;

export interface IdentityGenerator {
  organismId(): OrganismId;
  userId(): UserId;
  stateId(): StateId;
  proposalId(): ProposalId;
  eventId(): EventId;
  relationshipId(): RelationshipId;
  timestamp(): Timestamp;
}
