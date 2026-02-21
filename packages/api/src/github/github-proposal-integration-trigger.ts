/**
 * GitHub proposal integration trigger — enqueue issue dispatch intents.
 *
 * When a proposal is integrated, this trigger resolves a composed
 * github-repository twin and writes an idempotent dispatch row for the
 * background worker.
 */

import { randomUUID } from 'node:crypto';
import type { GitHubRepositoryPayload } from '@omnilith/content-types';
import type { CompositionRepository, OrganismId, Proposal, StateRepository, UserId } from '@omnilith/kernel';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../db/connection.js';
import { githubIssueDispatches } from '../db/schema.js';
import { isRepositoryAllowed, parseGitHubAllowlist } from './allowlist.js';
import { buildIssueDraftFromProposal } from './issue-draft.js';
import type { ProposalIntegrationTrigger, ProposalIntegrationTriggerInput } from './proposal-integration-trigger.js';

export interface GitHubProposalIntegrationTriggerDeps {
  readonly db: Database;
  readonly compositionRepository: CompositionRepository;
  readonly stateRepository: StateRepository;
}

interface ResolvedRepository {
  readonly organismId: string;
  readonly payload: GitHubRepositoryPayload;
}

function isGitHubRepositoryPayload(value: unknown): value is GitHubRepositoryPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<GitHubRepositoryPayload>;
  return (
    candidate.provider === 'github' &&
    typeof candidate.owner === 'string' &&
    candidate.owner.length > 0 &&
    typeof candidate.name === 'string' &&
    candidate.name.length > 0
  );
}

function getAllowlistFromEnv(): ReadonlySet<string> {
  return parseGitHubAllowlist(process.env.GITHUB_ALLOWED_REPOS);
}

function isEnabledFromEnv(): boolean {
  return process.env.GITHUB_ISSUE_AUTOMATION_ENABLED === 'true';
}

async function resolveRepositoryChild(
  organismId: OrganismId,
  deps: Pick<GitHubProposalIntegrationTriggerDeps, 'compositionRepository' | 'stateRepository'>,
): Promise<ResolvedRepository | undefined> {
  const children = await deps.compositionRepository.findChildren(organismId);
  const orderedChildren = [...children].sort((left, right) => {
    const leftPosition = left.position ?? Number.MAX_SAFE_INTEGER;
    const rightPosition = right.position ?? Number.MAX_SAFE_INTEGER;
    if (leftPosition !== rightPosition) {
      return leftPosition - rightPosition;
    }
    if (left.composedAt !== right.composedAt) {
      return left.composedAt - right.composedAt;
    }
    return left.childId.localeCompare(right.childId);
  });

  for (const child of orderedChildren) {
    const childState = await deps.stateRepository.findCurrentByOrganismId(child.childId);
    if (!childState || childState.contentTypeId !== 'github-repository') {
      continue;
    }
    if (!isGitHubRepositoryPayload(childState.payload)) {
      continue;
    }

    return {
      organismId: child.childId,
      payload: childState.payload,
    };
  }

  return undefined;
}

async function enqueueDispatchRow(
  proposal: Proposal,
  integratedBy: UserId,
  repositoryOrganismId: string,
  issueTitle: string,
  issueBody: string,
  deps: Pick<GitHubProposalIntegrationTriggerDeps, 'db'>,
): Promise<void> {
  const now = new Date();

  await deps.db
    .insert(githubIssueDispatches)
    .values({
      id: randomUUID(),
      proposalId: proposal.id,
      organismId: proposal.organismId,
      repositoryOrganismId,
      integratedBy,
      issueTitle,
      issueBody,
      status: 'pending',
      attemptCount: 0,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: githubIssueDispatches.proposalId });

  // If the row already existed from a previous run, keep its schedule intact.
  await deps.db
    .update(githubIssueDispatches)
    .set({
      issueTitle,
      issueBody,
      repositoryOrganismId,
      updatedAt: now,
    })
    .where(and(eq(githubIssueDispatches.proposalId, proposal.id), eq(githubIssueDispatches.status, 'pending')));
}

export class GitHubProposalIntegrationTrigger implements ProposalIntegrationTrigger {
  private readonly allowlist = getAllowlistFromEnv();
  private readonly enabled = isEnabledFromEnv();

  constructor(private readonly deps: GitHubProposalIntegrationTriggerDeps) {}

  async handleProposalIntegrated(input: ProposalIntegrationTriggerInput): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const repository = await resolveRepositoryChild(input.proposal.organismId, this.deps);
    if (!repository) {
      return;
    }

    if (!isRepositoryAllowed(this.allowlist, repository.payload)) {
      return;
    }

    const draft = buildIssueDraftFromProposal({ proposal: input.proposal });
    await enqueueDispatchRow(
      input.proposal,
      input.integratedBy,
      repository.organismId,
      draft.title,
      draft.body,
      this.deps,
    );
  }
}
