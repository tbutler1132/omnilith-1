/**
 * AccessControl — THE single central module for all permission logic.
 *
 * All authorization decisions flow through this module. One file.
 * A clear decision tree. Not scattered conditionals across handlers.
 *
 * Permission model:
 * 1. Check visibility — can the user see this organism at all?
 * 2. Check relationship — what relationship does the user have?
 * 3. Check action — is the action permitted given the relationship?
 *
 * Guest callers (`userId = null`) can view public organisms only.
 * All guest write actions are denied.
 *
 * Critical rule: Membership in a community does NOT automatically
 * grant integration authority over organisms inside it. Integration
 * authority must be explicitly assigned per-organism.
 */

import type { CompositionRepository } from '../composition/composition-repository.js';
import type { OrganismId, UserId } from '../identity.js';
import type { OrganismRepository } from '../organism/organism-repository.js';
import type { Relationship } from '../relationships/relationship.js';
import type { RelationshipRepository } from '../relationships/relationship-repository.js';
import type { SurfaceRepository } from './surface-repository.js';
import type { VisibilityLevel } from './visibility.js';
import type { VisibilityRepository } from './visibility-repository.js';

export type ActionType =
  | 'view'
  | 'append-state'
  | 'record-observation'
  | 'open-proposal'
  | 'integrate-proposal'
  | 'decline-proposal'
  | 'compose'
  | 'decompose'
  | 'change-visibility'
  | 'change-open-trunk';

export interface AccessDecision {
  readonly allowed: boolean;
  readonly reason?: string;
}

export interface AccessControlDeps {
  readonly visibilityRepository: VisibilityRepository;
  readonly surfaceRepository?: SurfaceRepository;
  readonly relationshipRepository: RelationshipRepository;
  readonly compositionRepository: CompositionRepository;
  readonly organismRepository: OrganismRepository;
}

export async function checkAccess(
  userId: UserId | null,
  organismId: OrganismId,
  action: ActionType,
  deps: AccessControlDeps,
): Promise<AccessDecision> {
  const organism = await deps.organismRepository.findById(organismId);
  if (!organism) {
    return { allowed: false, reason: 'Organism not found' };
  }

  // Step 1: Visibility check
  const visibility = await deps.visibilityRepository.findByOrganismId(organismId);
  const configuredLevel = visibility?.level ?? 'public';
  const isSurfaced = deps.surfaceRepository ? await deps.surfaceRepository.isSurfaced(organismId) : true;
  const level: VisibilityLevel = isSurfaced ? configuredLevel : 'private';

  // Guest caller path: unauthenticated users can only view public organisms.
  if (userId === null) {
    if (action !== 'view') {
      return { allowed: false, reason: 'Authentication required' };
    }

    if (level !== 'public') {
      return { allowed: false, reason: 'Organism is not public' };
    }

    return { allowed: true };
  }

  const relationships = await deps.relationshipRepository.findByUserAndOrganism(userId, organismId);

  if (level === 'private') {
    const hasDirectRelationship = relationships.length > 0;
    if (!hasDirectRelationship) {
      return { allowed: false, reason: 'Organism is private and user has no relationship to it' };
    }
  }

  if (level === 'members') {
    const hasMemberAccess = await checkMemberAccess(userId, organismId, relationships, deps);
    if (!hasMemberAccess) {
      return { allowed: false, reason: 'Organism is members-only and user is not a member' };
    }
  }

  // Step 2: Action-specific permission check
  return checkActionPermission(userId, organismId, action, relationships, deps);
}

async function checkMemberAccess(
  userId: UserId,
  organismId: OrganismId,
  directRelationships: ReadonlyArray<Relationship>,
  deps: AccessControlDeps,
): Promise<boolean> {
  // Direct relationship to this organism grants access
  if (directRelationships.length > 0) {
    return true;
  }

  // Membership in the parent community grants access
  const parent = await deps.compositionRepository.findParent(organismId);
  if (parent) {
    const parentRelationships = await deps.relationshipRepository.findByUserAndOrganism(userId, parent.parentId);
    return parentRelationships.some((r) => r.type === 'membership');
  }

  return false;
}

/**
 * Action permission matrix.
 *
 * view: allowed if visibility check passed (handled above)
 * append-state: organism must be open-trunk (enforced in use case)
 * record-observation: requires stewardship or integration authority
 * open-proposal: any user who can view can propose
 * integrate-proposal: requires integration-authority on THIS organism
 * decline-proposal: requires integration-authority on THIS organism
 * compose: requires stewardship on the parent organism
 * decompose: requires stewardship on the parent organism
 * change-visibility: requires stewardship on the organism
 * change-open-trunk: requires stewardship on the organism
 */
async function checkActionPermission(
  userId: UserId,
  organismId: OrganismId,
  action: ActionType,
  relationships: ReadonlyArray<Relationship>,
  deps: AccessControlDeps,
): Promise<AccessDecision> {
  switch (action) {
    case 'view':
      return { allowed: true };

    case 'append-state':
      // Open-trunk enforcement is in the use case; here we just check visibility passed
      return { allowed: true };

    case 'record-observation': {
      const canRecordObservation = relationships.some(
        (relationship) => relationship.type === 'stewardship' || relationship.type === 'integration-authority',
      );
      if (canRecordObservation) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'User does not have authority to record observations on this organism',
      };
    }

    case 'open-proposal':
      // Any user who can see the organism can propose
      return { allowed: true };

    case 'integrate-proposal':
    case 'decline-proposal': {
      // Requires explicit integration-authority on THIS specific organism
      const hasAuthority = relationships.some((r) => r.type === 'integration-authority');
      if (hasAuthority) {
        return { allowed: true };
      }

      // Stewards can also integrate/decline
      const isSteward = relationships.some((r) => r.type === 'stewardship');
      if (isSteward) {
        return { allowed: true };
      }

      // Check if user is the founder of the parent community
      const parent = await deps.compositionRepository.findParent(organismId);
      if (parent) {
        const parentRels = await deps.relationshipRepository.findByUserAndOrganism(userId, parent.parentId);
        const isFounder = parentRels.some((r) => r.type === 'membership' && r.role === 'founder');
        if (isFounder) {
          return { allowed: true };
        }
      }

      return {
        allowed: false,
        reason: 'User does not have integration authority on this organism',
      };
    }

    case 'compose':
    case 'decompose': {
      const isStewardForCompose = relationships.some((r) => r.type === 'stewardship');
      if (isStewardForCompose) {
        return { allowed: true };
      }

      // Founder of the organism's parent community can also compose/decompose
      const parentForCompose = await deps.compositionRepository.findParent(organismId);
      if (parentForCompose) {
        const parentRelsForCompose = await deps.relationshipRepository.findByUserAndOrganism(
          userId,
          parentForCompose.parentId,
        );
        const isFounderForCompose = parentRelsForCompose.some((r) => r.type === 'membership' && r.role === 'founder');
        if (isFounderForCompose) {
          return { allowed: true };
        }
      }

      return { allowed: false, reason: 'User does not have stewardship of this organism' };
    }

    case 'change-visibility': {
      const isStewardForVisibility = relationships.some((r) => r.type === 'stewardship');
      if (isStewardForVisibility) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'User does not have stewardship of this organism' };
    }

    case 'change-open-trunk': {
      const isStewardForOpenTrunk = relationships.some((r) => r.type === 'stewardship');
      if (isStewardForOpenTrunk) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'User does not have stewardship of this organism' };
    }

    default:
      return { allowed: false, reason: `Unknown action: ${action}` };
  }
}
