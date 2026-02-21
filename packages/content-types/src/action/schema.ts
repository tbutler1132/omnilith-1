/**
 * Action content type — executable response endpoint for cybernetic loops.
 *
 * Actions are composed inside a boundary and triggered by policy outcomes.
 * The runtime evaluates guardrails and executes adapter calls for low-risk
 * paths, or opens proposals for high-risk paths.
 */

import type { OrganismId, Timestamp } from '@omnilith/kernel';

export type ActionKind = 'github-pr' | 'open-proposal';
export type ActionExecutionMode = 'direct-low-risk' | 'proposal-required';
export type ActionRiskLevel = 'low' | 'high';

export interface ActionTrigger {
  readonly responsePolicyOrganismId: OrganismId;
  readonly whenDecision: 'pass' | 'decline';
}

export interface GitHubPrActionConfig {
  readonly owner: string;
  readonly repository: string;
  readonly baseBranch: string;
  readonly headBranch: string;
  readonly title: string;
  readonly body: string;
  readonly draft?: boolean;
}

export interface OpenProposalActionConfig {
  readonly targetOrganismId: OrganismId;
  readonly proposedContentTypeId: string;
  readonly proposedPayload: unknown;
  readonly description?: string;
}

interface BaseActionPayload {
  readonly label: string;
  readonly executionMode: ActionExecutionMode;
  readonly riskLevel: ActionRiskLevel;
  readonly trigger: ActionTrigger;
  readonly cooldownSeconds?: number;
  readonly lastExecutedAt?: Timestamp;
  readonly lastExecutionKey?: string;
}

export interface GitHubPrActionPayload extends BaseActionPayload {
  readonly kind: 'github-pr';
  readonly config: GitHubPrActionConfig;
}

export interface OpenProposalActionPayload extends BaseActionPayload {
  readonly kind: 'open-proposal';
  readonly config: OpenProposalActionConfig;
}

export type ActionPayload = GitHubPrActionPayload | OpenProposalActionPayload;
