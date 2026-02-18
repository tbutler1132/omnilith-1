/**
 * ContentTypeContract — the interface every content type implements.
 *
 * A content type is a five-part contract: schema (TypeScript types),
 * validator, optional evaluator (for policy types), renderer ID,
 * and differ ID. The renderer and differ are string references
 * resolved by the rendering layer — the kernel never loads UI code.
 */

import type { ContentTypeId, UserId } from '../identity.js';

export interface ValidationResult {
  readonly valid: boolean;
  readonly issues: string[];
}

export interface ValidationContext {
  readonly previousPayload?: unknown;
}

export interface EvaluationResult {
  readonly decision: 'pass' | 'decline';
  readonly reason?: string;
}

export interface ProposalForEvaluation {
  readonly proposedPayload: unknown;
  readonly proposedContentTypeId: ContentTypeId;
  readonly description?: string;
  readonly proposedBy: UserId;
}

export interface ContentTypeContract {
  readonly typeId: ContentTypeId;
  validate(payload: unknown, context?: ValidationContext): ValidationResult;
  evaluate?(proposal: ProposalForEvaluation, policyPayload: unknown): EvaluationResult;
}
