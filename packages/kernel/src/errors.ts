/**
 * Domain errors — typed failure conditions for kernel operations.
 *
 * Each error represents a specific domain violation that callers
 * can match on. These are not HTTP errors — adapters map them
 * to appropriate transport-level responses.
 */

export class OrganismNotFoundError extends Error {
  readonly kind = 'OrganismNotFoundError' as const;
  constructor(public readonly organismId: string) {
    super(`Organism not found: ${organismId}`);
    this.name = 'OrganismNotFoundError';
  }
}

export class StateNotFoundError extends Error {
  readonly kind = 'StateNotFoundError' as const;
  constructor(public readonly stateId: string) {
    super(`State not found: ${stateId}`);
    this.name = 'StateNotFoundError';
  }
}

export class AccessDeniedError extends Error {
  readonly kind = 'AccessDeniedError' as const;
  constructor(
    public readonly userId: string,
    public readonly action: string,
    public readonly organismId: string,
  ) {
    super(`Access denied: user ${userId} cannot ${action} on organism ${organismId}`);
    this.name = 'AccessDeniedError';
  }
}

export class ValidationFailedError extends Error {
  readonly kind = 'ValidationFailedError' as const;
  constructor(
    public readonly contentTypeId: string,
    public readonly issues: string[],
  ) {
    super(`Validation failed for content type ${contentTypeId}: ${issues.join(', ')}`);
    this.name = 'ValidationFailedError';
  }
}

export class ContentTypeNotRegisteredError extends Error {
  readonly kind = 'ContentTypeNotRegisteredError' as const;
  constructor(public readonly contentTypeId: string) {
    super(`Content type not registered: ${contentTypeId}`);
    this.name = 'ContentTypeNotRegisteredError';
  }
}

export class CompositionError extends Error {
  readonly kind = 'CompositionError' as const;
  constructor(message: string) {
    super(message);
    this.name = 'CompositionError';
  }
}

export class ProposalAlreadyResolvedError extends Error {
  readonly kind = 'ProposalAlreadyResolvedError' as const;
  constructor(
    public readonly proposalId: string,
    public readonly currentStatus: string,
  ) {
    super(`Proposal ${proposalId} already resolved with status: ${currentStatus}`);
    this.name = 'ProposalAlreadyResolvedError';
  }
}

export class ProposalNotFoundError extends Error {
  readonly kind = 'ProposalNotFoundError' as const;
  constructor(public readonly proposalId: string) {
    super(`Proposal not found: ${proposalId}`);
    this.name = 'ProposalNotFoundError';
  }
}

export type DomainError =
  | OrganismNotFoundError
  | StateNotFoundError
  | AccessDeniedError
  | ValidationFailedError
  | ContentTypeNotRegisteredError
  | CompositionError
  | ProposalAlreadyResolvedError
  | ProposalNotFoundError;
