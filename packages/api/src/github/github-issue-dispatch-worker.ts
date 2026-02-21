/**
 * GitHub issue dispatch worker — processes queued proposal->issue transitions.
 *
 * Runs outside request/response flow so external API latency and retries
 * do not block proposal integration endpoints.
 */

import type { GitHubIssuePayload } from '@omnilith/content-types';
import type { ContentTypeId, OrganismId, ProposalId, Timestamp, UserId } from '@omnilith/kernel';
import { createOrganism } from '@omnilith/kernel';
import { and, asc, eq, lte } from 'drizzle-orm';
import type { Container } from '../container.js';
import { githubIssueDispatches, githubIssueLinks } from '../db/schema.js';
import { isRepositoryAllowed, parseGitHubAllowlist } from './allowlist.js';
import type { GitHubIssueGateway, GitHubIssueRecord } from './github-issue-gateway.js';
import { GitHubRestIssueGateway } from './github-issue-gateway.js';

interface WorkerConfig {
  readonly maxToProcess: number;
  readonly maxAttempts: number;
}

interface DispatchRow {
  readonly id: string;
  readonly proposalId: string;
  readonly organismId: string;
  readonly repositoryOrganismId: string;
  readonly integratedBy: string;
  readonly issueTitle: string;
  readonly issueBody: string;
  readonly attemptCount: number;
}

interface GitHubRepositoryPayload {
  readonly provider: 'github';
  readonly owner: string;
  readonly name: string;
}

function isGitHubRepositoryPayload(payload: unknown): payload is GitHubRepositoryPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const candidate = payload as Partial<GitHubRepositoryPayload>;
  return (
    candidate.provider === 'github' &&
    typeof candidate.owner === 'string' &&
    candidate.owner.length > 0 &&
    typeof candidate.name === 'string' &&
    candidate.name.length > 0
  );
}

function workerConfigFromEnv(): WorkerConfig {
  const maxToProcess = Number.parseInt(process.env.GITHUB_ISSUE_DISPATCH_BATCH_SIZE ?? '20', 10);
  const maxAttempts = Number.parseInt(process.env.GITHUB_ISSUE_DISPATCH_MAX_ATTEMPTS ?? '5', 10);

  return {
    maxToProcess: Number.isFinite(maxToProcess) && maxToProcess > 0 ? maxToProcess : 20,
    maxAttempts: Number.isFinite(maxAttempts) && maxAttempts > 0 ? maxAttempts : 5,
  };
}

function buildGatewayFromEnv(): GitHubIssueGateway {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error('GITHUB_TOKEN is required to process github issue dispatches');
  }

  const apiBaseUrl = process.env.GITHUB_API_BASE_URL?.trim() || undefined;
  return new GitHubRestIssueGateway(token, apiBaseUrl);
}

function computeBackoffMs(attemptCount: number): number {
  const exponent = Math.max(0, attemptCount - 1);
  const seconds = Math.min(300, 10 * 2 ** exponent);
  return seconds * 1000;
}

async function claimNextDispatch(container: Container): Promise<DispatchRow | undefined> {
  const now = new Date();
  const pendingRows = await container.db
    .select({
      id: githubIssueDispatches.id,
      proposalId: githubIssueDispatches.proposalId,
      organismId: githubIssueDispatches.organismId,
      repositoryOrganismId: githubIssueDispatches.repositoryOrganismId,
      integratedBy: githubIssueDispatches.integratedBy,
      issueTitle: githubIssueDispatches.issueTitle,
      issueBody: githubIssueDispatches.issueBody,
      attemptCount: githubIssueDispatches.attemptCount,
    })
    .from(githubIssueDispatches)
    .where(and(eq(githubIssueDispatches.status, 'pending'), lte(githubIssueDispatches.nextAttemptAt, now)))
    .orderBy(asc(githubIssueDispatches.createdAt))
    .limit(1);

  const candidate = pendingRows[0];
  if (!candidate) {
    return undefined;
  }

  const claimedRows = await container.db
    .update(githubIssueDispatches)
    .set({
      status: 'processing',
      attemptCount: candidate.attemptCount + 1,
      processingStartedAt: now,
      updatedAt: now,
      lastError: null,
    })
    .where(and(eq(githubIssueDispatches.id, candidate.id), eq(githubIssueDispatches.status, 'pending')))
    .returning({
      id: githubIssueDispatches.id,
      proposalId: githubIssueDispatches.proposalId,
      organismId: githubIssueDispatches.organismId,
      repositoryOrganismId: githubIssueDispatches.repositoryOrganismId,
      integratedBy: githubIssueDispatches.integratedBy,
      issueTitle: githubIssueDispatches.issueTitle,
      issueBody: githubIssueDispatches.issueBody,
      attemptCount: githubIssueDispatches.attemptCount,
    });

  return claimedRows[0];
}

async function markDelivered(container: Container, dispatchId: string): Promise<void> {
  const now = new Date();
  await container.db
    .update(githubIssueDispatches)
    .set({
      status: 'delivered',
      deliveredAt: now,
      processingStartedAt: null,
      updatedAt: now,
      lastError: null,
    })
    .where(eq(githubIssueDispatches.id, dispatchId));
}

async function rescheduleOrFail(
  container: Container,
  dispatch: DispatchRow,
  errorMessage: string,
  maxAttempts: number,
): Promise<void> {
  const now = new Date();
  const shouldFail = dispatch.attemptCount >= maxAttempts;
  const nextAttemptAt = shouldFail ? now : new Date(now.getTime() + computeBackoffMs(dispatch.attemptCount));

  await container.db
    .update(githubIssueDispatches)
    .set({
      status: shouldFail ? 'failed' : 'pending',
      nextAttemptAt,
      processingStartedAt: null,
      updatedAt: now,
      lastError: errorMessage.slice(0, 1000),
    })
    .where(eq(githubIssueDispatches.id, dispatch.id));
}

async function resolveRepositoryPayload(
  container: Container,
  repositoryOrganismId: string,
): Promise<GitHubRepositoryPayload> {
  const repositoryState = await container.stateRepository.findCurrentByOrganismId(repositoryOrganismId as OrganismId);
  if (!repositoryState || repositoryState.contentTypeId !== 'github-repository') {
    throw new Error(`repository organism ${repositoryOrganismId} is missing github-repository state`);
  }

  if (!isGitHubRepositoryPayload(repositoryState.payload)) {
    throw new Error(`repository organism ${repositoryOrganismId} payload is invalid`);
  }

  return repositoryState.payload;
}

async function createIssueTwinOrganism(
  container: Container,
  dispatch: DispatchRow,
  issue: GitHubIssueRecord,
): Promise<string> {
  const now = container.identityGenerator.timestamp();
  const payload: GitHubIssuePayload = {
    repositoryOrganismId: dispatch.repositoryOrganismId as OrganismId,
    sourceProposalId: dispatch.proposalId as ProposalId,
    sourceOrganismId: dispatch.organismId as OrganismId,
    externalIssueNumber: issue.number,
    externalIssueUrl: issue.url,
    title: issue.title,
    body: issue.body,
    state: issue.state,
    labels: issue.labels,
    sync: {
      status: 'synced',
      lastSyncedAt: now as Timestamp,
    },
  };

  const createResult = await createOrganism(
    {
      name: `Issue #${issue.number} — ${issue.title}`,
      contentTypeId: 'github-issue' as ContentTypeId,
      payload,
      createdBy: dispatch.integratedBy as UserId,
      openTrunk: true,
    },
    {
      organismRepository: container.organismRepository,
      stateRepository: container.stateRepository,
      contentTypeRegistry: container.contentTypeRegistry,
      eventPublisher: container.eventPublisher,
      relationshipRepository: container.relationshipRepository,
      identityGenerator: container.identityGenerator,
    },
  );

  return createResult.organism.id;
}

async function processDispatchRow(
  container: Container,
  dispatch: DispatchRow,
  gateway: GitHubIssueGateway,
  allowlist: ReadonlySet<string>,
): Promise<void> {
  const existingLink = await container.db
    .select({ proposalId: githubIssueLinks.proposalId })
    .from(githubIssueLinks)
    .where(eq(githubIssueLinks.proposalId, dispatch.proposalId))
    .limit(1);

  if (existingLink.length > 0) {
    await markDelivered(container, dispatch.id);
    return;
  }

  const repositoryPayload = await resolveRepositoryPayload(container, dispatch.repositoryOrganismId);
  if (!isRepositoryAllowed(allowlist, repositoryPayload)) {
    throw new Error(`repository ${repositoryPayload.owner}/${repositoryPayload.name} is not in GITHUB_ALLOWED_REPOS`);
  }

  const existingIssue = await gateway.findIssueByProposalMarker({
    owner: repositoryPayload.owner,
    repository: repositoryPayload.name,
    proposalId: dispatch.proposalId as ProposalId,
  });

  const issue =
    existingIssue ??
    (await gateway.createIssue({
      owner: repositoryPayload.owner,
      repository: repositoryPayload.name,
      title: dispatch.issueTitle,
      body: dispatch.issueBody,
    }));

  const issueOrganismId = await createIssueTwinOrganism(container, dispatch, issue);

  const now = new Date();
  await container.db
    .insert(githubIssueLinks)
    .values({
      proposalId: dispatch.proposalId,
      issueOrganismId,
      repositoryOrganismId: dispatch.repositoryOrganismId,
      actorId: dispatch.integratedBy,
      githubOwner: repositoryPayload.owner,
      githubRepo: repositoryPayload.name,
      githubIssueNumber: issue.number,
      githubIssueUrl: issue.url,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: githubIssueLinks.proposalId });

  await markDelivered(container, dispatch.id);
}

export async function processGitHubIssueDispatchBatch(container: Container): Promise<number> {
  const config = workerConfigFromEnv();
  const gateway = buildGatewayFromEnv();
  const allowlist = parseGitHubAllowlist(process.env.GITHUB_ALLOWED_REPOS);

  if (allowlist.size === 0) {
    throw new Error('GITHUB_ALLOWED_REPOS must contain at least one owner/repository entry');
  }

  let processed = 0;
  while (processed < config.maxToProcess) {
    const dispatch = await claimNextDispatch(container);
    if (!dispatch) {
      break;
    }

    try {
      await processDispatchRow(container, dispatch, gateway, allowlist);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown dispatch error';
      await rescheduleOrFail(container, dispatch, message, config.maxAttempts);
    }

    processed += 1;
  }

  return processed;
}
