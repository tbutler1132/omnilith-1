/**
 * Proposal routes — open, list, integrate, decline.
 */

import type {
  ContentTypeId,
  DeclineProposalRequest,
  DomainError,
  OpenMutationProposalRequest,
  OpenProposalMutationRequest,
  OpenProposalRequest,
  OrganismId,
  ProposalId,
} from '@omnilith/kernel';
import { declineProposal, integrateProposal, openProposal } from '@omnilith/kernel';
import { Hono } from 'hono';
import type { Container } from '../container.js';
import type { AuthEnv } from '../middleware/auth.js';
import { parseJsonBody } from '../utils/parse-json.js';
import { requireOrganismAccess } from './access.js';

export function proposalRoutes(container: Container) {
  const app = new Hono<AuthEnv>();

  // Open proposal (on organism)
  app.post('/organisms/:id/proposals', async (c) => {
    const userId = c.get('userId');
    const organismId = c.req.param('id') as OrganismId;
    const body = await parseJsonBody<OpenProposalRequest>(c);

    if (!body) return c.json({ error: 'Invalid JSON body' }, 400);
    const accessError = await requireOrganismAccess(c, container, userId, organismId, 'open-proposal');
    if (accessError) return accessError;

    try {
      const openInput = isOpenMutationProposalRequest(body)
        ? {
            organismId,
            mutation: toKernelMutation(body.mutation),
            description: body.description,
            proposedBy: userId,
          }
        : {
            organismId,
            proposedContentTypeId: body.proposedContentTypeId as ContentTypeId,
            proposedPayload: body.proposedPayload,
            description: body.description,
            proposedBy: userId,
          };

      const proposal = await openProposal(openInput, {
        organismRepository: container.organismRepository,
        stateRepository: container.stateRepository,
        proposalRepository: container.proposalRepository,
        contentTypeRegistry: container.contentTypeRegistry,
        eventPublisher: container.eventPublisher,
        identityGenerator: container.identityGenerator,
        visibilityRepository: container.visibilityRepository,
        relationshipRepository: container.relationshipRepository,
        compositionRepository: container.compositionRepository,
      });

      return c.json({ proposal }, 201);
    } catch (err) {
      const e = err as DomainError;
      if (e.kind === 'OrganismNotFoundError') return c.json({ error: e.message }, 404);
      if (e.kind === 'ValidationFailedError') return c.json({ error: e.message }, 400);
      if (e.kind === 'ContentTypeNotRegisteredError') return c.json({ error: e.message }, 400);
      throw err;
    }
  });

  // List proposals for organism
  app.get('/organisms/:id/proposals', async (c) => {
    const userId = c.get('userId');
    const organismId = c.req.param('id') as OrganismId;
    const accessError = await requireOrganismAccess(c, container, userId, organismId, 'view');
    if (accessError) return accessError;

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

      if (result.outcome === 'policy-declined') {
        return c.json({ proposal: result.proposal, policyDeclined: true });
      }
      return c.json({ proposal: result.proposal, newState: result.newState });
    } catch (err) {
      const e = err as DomainError;
      if (e.kind === 'ProposalNotFoundError') return c.json({ error: e.message }, 404);
      if (e.kind === 'ProposalAlreadyResolvedError') return c.json({ error: e.message }, 409);
      if (e.kind === 'AccessDeniedError') return c.json({ error: e.message }, 403);
      if (e.kind === 'ValidationFailedError') return c.json({ error: e.message }, 400);
      if (e.kind === 'ContentTypeNotRegisteredError') return c.json({ error: e.message }, 400);
      throw err;
    }
  });

  // Decline proposal
  app.post('/proposals/:id/decline', async (c) => {
    const userId = c.get('userId');
    const proposalId = c.req.param('id') as ProposalId;
    const body = await c.req.json<DeclineProposalRequest>().catch(() => ({ reason: undefined }));

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
    } catch (err) {
      const e = err as DomainError;
      if (e.kind === 'ProposalNotFoundError') return c.json({ error: e.message }, 404);
      if (e.kind === 'ProposalAlreadyResolvedError') return c.json({ error: e.message }, 409);
      if (e.kind === 'AccessDeniedError') return c.json({ error: e.message }, 403);
      throw err;
    }
  });

  return app;
}

function isOpenMutationProposalRequest(body: OpenProposalRequest): body is OpenMutationProposalRequest {
  return typeof body === 'object' && body !== null && 'mutation' in body;
}

function toKernelMutation(mutation: OpenProposalMutationRequest) {
  switch (mutation.kind) {
    case 'append-state':
      return {
        kind: mutation.kind,
        contentTypeId: mutation.contentTypeId as ContentTypeId,
        payload: mutation.payload,
      };
    case 'compose':
      return {
        kind: mutation.kind,
        childId: mutation.childId as OrganismId,
        position: mutation.position,
      };
    case 'decompose':
      return {
        kind: mutation.kind,
        childId: mutation.childId as OrganismId,
      };
    case 'change-visibility':
      return {
        kind: mutation.kind,
        level: mutation.level,
      };
  }
}
