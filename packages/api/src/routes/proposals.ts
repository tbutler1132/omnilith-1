/**
 * Proposal routes — open, list, integrate, decline.
 */

import { Hono } from 'hono';
import type { OrganismId, ProposalId, ContentTypeId } from '@omnilith/kernel';
import { openProposal, integrateProposal, declineProposal } from '@omnilith/kernel';
import type { Container } from '../container.js';
import type { AuthEnv } from '../middleware/auth.js';

export function proposalRoutes(container: Container) {
  const app = new Hono<AuthEnv>();

  // Open proposal (on organism)
  app.post('/organisms/:id/proposals', async (c) => {
    const userId = c.get('userId');
    const organismId = c.req.param('id') as OrganismId;
    const body = await c.req.json<{
      proposedContentTypeId: string;
      proposedPayload: unknown;
    }>();

    try {
      const proposal = await openProposal(
        {
          organismId,
          proposedContentTypeId: body.proposedContentTypeId as ContentTypeId,
          proposedPayload: body.proposedPayload,
          proposedBy: userId,
        },
        {
          organismRepository: container.organismRepository,
          proposalRepository: container.proposalRepository,
          contentTypeRegistry: container.contentTypeRegistry,
          eventPublisher: container.eventPublisher,
          identityGenerator: container.identityGenerator,
        },
      );

      return c.json({ proposal }, 201);
    } catch (err: any) {
      if (err.kind === 'OrganismNotFoundError') return c.json({ error: err.message }, 404);
      if (err.kind === 'ValidationFailedError') return c.json({ error: err.message }, 400);
      if (err.kind === 'ContentTypeNotRegisteredError') return c.json({ error: err.message }, 400);
      throw err;
    }
  });

  // List proposals for organism
  app.get('/organisms/:id/proposals', async (c) => {
    const organismId = c.req.param('id') as OrganismId;
    const proposals = await container.proposalRepository.findByOrganismId(organismId);
    return c.json({ proposals });
  });

  // Integrate proposal
  app.post('/proposals/:id/integrate', async (c) => {
    const userId = c.get('userId');
    const proposalId = c.req.param('id') as ProposalId;

    try {
      const result = await integrateProposal(
        { proposalId, integratedBy: userId },
        {
          proposalRepository: container.proposalRepository,
          organismRepository: container.organismRepository,
          stateRepository: container.stateRepository,
          contentTypeRegistry: container.contentTypeRegistry,
          compositionRepository: container.compositionRepository,
          eventPublisher: container.eventPublisher,
          relationshipRepository: container.relationshipRepository,
          visibilityRepository: container.visibilityRepository,
          identityGenerator: container.identityGenerator,
        },
      );

      return c.json({ proposal: result.proposal, newState: result.newState });
    } catch (err: any) {
      if (err.kind === 'ProposalNotFoundError') return c.json({ error: err.message }, 404);
      if (err.kind === 'ProposalAlreadyResolvedError') return c.json({ error: err.message }, 409);
      if (err.kind === 'AccessDeniedError') return c.json({ error: err.message }, 403);
      throw err;
    }
  });

  // Decline proposal
  app.post('/proposals/:id/decline', async (c) => {
    const userId = c.get('userId');
    const proposalId = c.req.param('id') as ProposalId;
    const body = await c.req.json<{ reason?: string }>().catch(() => ({ reason: undefined }));

    try {
      const proposal = await declineProposal(
        { proposalId, declinedBy: userId, reason: body.reason },
        {
          proposalRepository: container.proposalRepository,
          organismRepository: container.organismRepository,
          compositionRepository: container.compositionRepository,
          eventPublisher: container.eventPublisher,
          relationshipRepository: container.relationshipRepository,
          visibilityRepository: container.visibilityRepository,
          identityGenerator: container.identityGenerator,
        },
      );

      return c.json({ proposal });
    } catch (err: any) {
      if (err.kind === 'ProposalNotFoundError') return c.json({ error: err.message }, 404);
      if (err.kind === 'ProposalAlreadyResolvedError') return c.json({ error: err.message }, 409);
      if (err.kind === 'AccessDeniedError') return c.json({ error: err.message }, 403);
      throw err;
    }
  });

  return app;
}
