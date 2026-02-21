/**
 * GitHub integration routes — webhook ingestion for issue twins.
 *
 * This route ingests GitHub issue events, updates linked github-issue
 * organisms, and optionally records sensor observations for cybernetic
 * regulation.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { GitHubIssuePayload } from '@omnilith/content-types';
import type { ContentTypeId, OrganismId, ProposalId, Timestamp, UserId } from '@omnilith/kernel';
import { appendState, recordObservation } from '@omnilith/kernel';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type { Container } from '../container.js';
import { githubIssueLinks } from '../db/schema.js';
import { resolveObservationActor } from '../regulator/resolve-observation-actor.js';
import { isRepositoryAllowed, parseGitHubAllowlist } from './allowlist.js';

interface GitHubIssueWebhookPayload {
  readonly action?: string;
  readonly repository?: {
    readonly owner?: { readonly login?: string };
    readonly name?: string;
  };
  readonly issue?: {
    readonly number?: number;
    readonly title?: string;
    readonly body?: string | null;
    readonly state?: string;
    readonly html_url?: string;
    readonly labels?: ReadonlyArray<{ readonly name?: string | null }>;
  };
}

function sanitizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function verifyGitHubSignature(rawBody: string, secret: string, headerValue: string | undefined): boolean {
  if (!headerValue) {
    return false;
  }

  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(headerValue);
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function actionToSensorDelta(action: string | undefined): number {
  switch (action) {
    case 'opened':
    case 'reopened':
      return 1;
    case 'closed':
      return -1;
    default:
      return 0;
  }
}

function toIssueState(value: string | undefined): 'open' | 'closed' {
  return value === 'closed' ? 'closed' : 'open';
}

export function githubIntegrationRoutes(container: Container) {
  const app = new Hono();

  app.post('/webhooks', async (c) => {
    const rawBody = await c.req.text();
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET?.trim();
    if (webhookSecret) {
      const signature = c.req.header('x-hub-signature-256');
      const verified = verifyGitHubSignature(rawBody, webhookSecret, signature);
      if (!verified) {
        return c.json({ error: 'Invalid GitHub webhook signature' }, 401);
      }
    }

    const eventType = c.req.header('x-github-event');
    if (eventType !== 'issues') {
      return c.json({ ok: true, ignored: 'unsupported_event' }, 202);
    }

    let payload: GitHubIssueWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as GitHubIssueWebhookPayload;
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const owner = sanitizeString(payload.repository?.owner?.login);
    const repository = sanitizeString(payload.repository?.name);
    const issueNumber = payload.issue?.number;
    const issueTitle = sanitizeString(payload.issue?.title);

    if (!owner || !repository || typeof issueNumber !== 'number' || !issueTitle) {
      return c.json({ error: 'Missing required issue webhook fields' }, 400);
    }

    const allowlist = parseGitHubAllowlist(process.env.GITHUB_ALLOWED_REPOS);
    if (!isRepositoryAllowed(allowlist, { owner, name: repository })) {
      return c.json({ ok: true, ignored: 'repository_not_allowlisted' }, 202);
    }

    const links = await container.db
      .select()
      .from(githubIssueLinks)
      .where(
        and(
          eq(githubIssueLinks.githubOwner, owner),
          eq(githubIssueLinks.githubRepo, repository),
          eq(githubIssueLinks.githubIssueNumber, issueNumber),
        ),
      )
      .limit(1);

    const link = links[0];
    if (!link) {
      return c.json({ ok: true, ignored: 'unlinked_issue' }, 202);
    }

    const currentState = await container.stateRepository.findCurrentByOrganismId(link.issueOrganismId as OrganismId);
    if (!currentState || currentState.contentTypeId !== 'github-issue') {
      return c.json({ error: 'Linked issue organism state not found' }, 409);
    }

    const previousPayload = currentState.payload as Partial<GitHubIssuePayload>;
    if (!previousPayload.sourceOrganismId || !previousPayload.sourceProposalId) {
      return c.json({ error: 'Linked issue organism is missing source trace' }, 409);
    }

    const now = container.identityGenerator.timestamp();
    const nextPayload: GitHubIssuePayload = {
      repositoryOrganismId: (previousPayload.repositoryOrganismId ?? link.repositoryOrganismId) as OrganismId,
      sourceProposalId: previousPayload.sourceProposalId as ProposalId,
      sourceOrganismId: previousPayload.sourceOrganismId as OrganismId,
      externalIssueNumber: issueNumber,
      externalIssueUrl: sanitizeString(payload.issue?.html_url) ?? link.githubIssueUrl,
      title: issueTitle,
      body: typeof payload.issue?.body === 'string' ? payload.issue.body : (previousPayload.body ?? ''),
      state: toIssueState(sanitizeString(payload.issue?.state)),
      labels: (payload.issue?.labels ?? [])
        .map((label) => sanitizeString(label.name) ?? '')
        .filter((label) => label.length > 0),
      sync: {
        status: 'synced',
        lastSyncedAt: now as Timestamp,
      },
    };

    const updatedState = await appendState(
      {
        organismId: link.issueOrganismId as OrganismId,
        contentTypeId: 'github-issue' as ContentTypeId,
        payload: nextPayload,
        appendedBy: link.actorId as UserId,
      },
      {
        organismRepository: container.organismRepository,
        stateRepository: container.stateRepository,
        contentTypeRegistry: container.contentTypeRegistry,
        eventPublisher: container.eventPublisher,
        identityGenerator: container.identityGenerator,
        visibilityRepository: container.visibilityRepository,
        relationshipRepository: container.relationshipRepository,
        compositionRepository: container.compositionRepository,
      },
    );

    const sensorOrganismId = sanitizeString(process.env.GITHUB_ISSUE_SENSOR_ORGANISM_ID);
    const sensorDelta = actionToSensorDelta(sanitizeString(payload.action));

    if (sensorOrganismId && sensorDelta !== 0) {
      const observationActor = await resolveObservationActor(container, {
        sensorOrganismId: sensorOrganismId as OrganismId,
        targetOrganismId: link.issueOrganismId as OrganismId,
        preferredActorIds: [link.actorId as UserId],
      });
      if (!observationActor) {
        console.error('Failed to resolve authorized actor for github issue observation:', {
          sensorOrganismId,
          targetOrganismId: link.issueOrganismId,
        });
      } else {
        try {
          await recordObservation(
            {
              organismId: sensorOrganismId as OrganismId,
              targetOrganismId: link.issueOrganismId as OrganismId,
              metric: 'github-issues',
              value: sensorDelta,
              sampledAt: now as Timestamp,
              observedBy: observationActor,
            },
            {
              organismRepository: container.organismRepository,
              eventPublisher: container.eventPublisher,
              identityGenerator: container.identityGenerator,
              visibilityRepository: container.visibilityRepository,
              relationshipRepository: container.relationshipRepository,
              compositionRepository: container.compositionRepository,
            },
          );
        } catch (error) {
          console.error('Failed to record github issue observation:', error);
        }
      }
    }

    return c.json({ ok: true, issueOrganismId: link.issueOrganismId, stateId: updatedState.id }, 202);
  });

  return app;
}
