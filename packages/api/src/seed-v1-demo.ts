/**
 * V1 demo seed — minimal launch world with core surfaced organisms.
 *
 * Produces a focused demo:
 * 1) Hero's Journey concept album organism with composed song organisms.
 * 2) Weekly Updates composition with composed text organisms.
 * 3) Omnilith Repository organism with a cybernetic awareness loop.
 * 4) A private community organism that contains the major community institutions.
 * 5) Main demo organisms composed directly into the community boundary.
 */

import { randomBytes, scryptSync } from 'node:crypto';
import type { ContentTypeId, OrganismId, UserId } from '@omnilith/kernel';
import { appendState, composeOrganism, createOrganism } from '@omnilith/kernel';
import { eq } from 'drizzle-orm';
import type { Container } from './container.js';
import { platformConfig, sessions, users } from './db/schema.js';
import { loadHeroJourneyV1DemoBlueprint } from './seed-blueprints/load-hero-journey-v1-demo-blueprint.js';
import { seedHeroJourney } from './seed-helpers/hero-journey.js';

const V1_DEMO_SEED_KEY = 'v1_demo_seed_complete';
const DEMO_USER_EMAIL = 'demo@omnilith.local';
const DEMO_USER_PASSWORD = 'demo';
const DEV_USER_EMAIL = 'dev@omnilith.local';
const DEV_USER_PASSWORD = 'dev';
const DEV_SESSION_ID = 'dev-session-00000000';
const PROJECT_GITHUB_OWNER = 'tbutler1132';
const PROJECT_GITHUB_REPOSITORY = 'omnilith-1';
const PROJECT_GITHUB_REPOSITORY_URL = `https://github.com/${PROJECT_GITHUB_OWNER}/${PROJECT_GITHUB_REPOSITORY}`;

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export async function seedV1Demo(container: Container): Promise<void> {
  const existing = await container.db.select().from(platformConfig).where(eq(platformConfig.key, V1_DEMO_SEED_KEY));
  if (existing.length > 0) {
    console.log('V1 demo seed already applied.');
    return;
  }

  console.log('Seeding V1 demo world...');

  const createDeps = {
    organismRepository: container.organismRepository,
    stateRepository: container.stateRepository,
    contentTypeRegistry: container.contentTypeRegistry,
    eventPublisher: container.eventPublisher,
    relationshipRepository: container.relationshipRepository,
    identityGenerator: container.identityGenerator,
  };

  const composeDeps = {
    organismRepository: container.organismRepository,
    compositionRepository: container.compositionRepository,
    visibilityRepository: container.visibilityRepository,
    relationshipRepository: container.relationshipRepository,
    eventPublisher: container.eventPublisher,
    identityGenerator: container.identityGenerator,
  };

  const appendDeps = {
    organismRepository: container.organismRepository,
    stateRepository: container.stateRepository,
    contentTypeRegistry: container.contentTypeRegistry,
    eventPublisher: container.eventPublisher,
    identityGenerator: container.identityGenerator,
    visibilityRepository: container.visibilityRepository,
    relationshipRepository: container.relationshipRepository,
    compositionRepository: container.compositionRepository,
  };

  const demoUserId = container.identityGenerator.userId();
  await container.db.insert(users).values({
    id: demoUserId,
    email: DEMO_USER_EMAIL,
    passwordHash: hashPassword(DEMO_USER_PASSWORD),
  });

  const devUserId = container.identityGenerator.userId();
  await container.db.insert(users).values({
    id: devUserId,
    email: DEV_USER_EMAIL,
    passwordHash: hashPassword(DEV_USER_PASSWORD),
  });

  await container.db.insert(sessions).values({
    id: DEV_SESSION_ID,
    userId: devUserId,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  });

  const heroJourneyBlueprint = await loadHeroJourneyV1DemoBlueprint();
  const heroJourney = await seedHeroJourney(container, demoUserId, heroJourneyBlueprint);

  const weeklyUpdates = await createOrganism(
    {
      name: 'Weekly Updates',
      contentTypeId: 'composition-reference' as ContentTypeId,
      payload: {
        entries: [],
        arrangementType: 'sequential',
      },
      createdBy: demoUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const weeklyEntries: Array<{ organismId: OrganismId; position: number }> = [];
  for (const [index, copy] of [
    'Week 1 — Establishing the narrative arc and sonic palette.',
    'Week 2 — Reworking transitions between trial and return chapters.',
    'Week 3 — Tightening mixes and preparing scene polish.',
  ].entries()) {
    const entry = await createOrganism(
      {
        name: `Weekly Update ${index + 1}`,
        contentTypeId: 'text' as ContentTypeId,
        payload: {
          content: `# Weekly Update ${index + 1}\n\n${copy}`,
          format: 'markdown',
          metadata: { title: `Weekly Update ${index + 1}` },
        },
        createdBy: demoUserId,
        openTrunk: true,
      },
      createDeps,
    );

    await composeOrganism(
      {
        parentId: weeklyUpdates.organism.id,
        childId: entry.organism.id,
        composedBy: demoUserId,
        position: index,
      },
      composeDeps,
    );

    weeklyEntries.push({ organismId: entry.organism.id, position: index + 1 });
  }

  await appendState(
    {
      organismId: weeklyUpdates.organism.id,
      contentTypeId: 'composition-reference' as ContentTypeId,
      payload: {
        entries: weeklyEntries,
        arrangementType: 'sequential',
      },
      appendedBy: demoUserId,
    },
    appendDeps,
  );

  const projectRepository = await createOrganism(
    {
      name: 'Omnilith Repository',
      contentTypeId: 'github-repository' as ContentTypeId,
      payload: {
        provider: 'github',
        owner: PROJECT_GITHUB_OWNER,
        name: PROJECT_GITHUB_REPOSITORY,
        defaultBranch: 'main',
        repositoryUrl: PROJECT_GITHUB_REPOSITORY_URL,
        sync: {
          status: 'synced',
        },
      },
      createdBy: devUserId,
    },
    createDeps,
  );

  const repositoryIssueSensor = await createOrganism(
    {
      name: 'Repository Issue Sensor',
      contentTypeId: 'sensor' as ContentTypeId,
      payload: {
        label: 'repository-issue-pressure',
        targetOrganismId: projectRepository.organism.id,
        metric: 'github-issues',
        readings: [],
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const repositoryIssueVariable = await createOrganism(
    {
      name: 'Repository Issue Variable',
      contentTypeId: 'variable' as ContentTypeId,
      payload: {
        label: 'repository-issue-pressure',
        value: 0,
        unit: 'issues',
        computedAt: container.identityGenerator.timestamp(),
        computation: {
          mode: 'observation-sum',
          sensorLabel: 'repository-issue-pressure',
          metric: 'github-issues',
          windowSeconds: 3600,
        },
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const repositoryResponsePolicy = await createOrganism(
    {
      name: 'Repository Response Policy',
      contentTypeId: 'response-policy' as ContentTypeId,
      payload: {
        mode: 'variable-threshold',
        variableLabel: 'repository-issue-pressure',
        condition: 'above',
        threshold: 0,
        currentVariableValue: 0,
        action: 'decline-all',
        reason: 'Issue pressure is high. Prioritize issue resolution until pressure returns to baseline.',
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const repositoryProposalAction = await createOrganism(
    {
      name: 'Repository Follow-up Action',
      contentTypeId: 'action' as ContentTypeId,
      payload: {
        label: 'Open repository issue-resolution proposal',
        kind: 'open-proposal',
        executionMode: 'proposal-required',
        riskLevel: 'high',
        trigger: {
          responsePolicyOrganismId: repositoryResponsePolicy.organism.id,
          whenDecision: 'decline',
        },
        config: {
          targetOrganismId: projectRepository.organism.id,
          proposedContentTypeId: 'text',
          proposedPayload: {
            content:
              'Repository issue pressure is above threshold. Manually resolve one issue (including PR work as needed), then close the issue so pressure observations return toward baseline.',
            format: 'markdown',
          },
          description: 'Repository issue-resolution follow-up proposal from seed loop',
          fanOutByVariableCount: true,
        },
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const repositoryWhy = await createOrganism(
    {
      name: 'omnilith-repository-why',
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: [
          '# Omnilith Repository — Why',
          '',
          'This boundary exists to keep delivery coherent and reliable for the software system.',
          '',
          '## Next steps',
          '- Keep issue pressure below the policy threshold through weekly triage.',
          '- Integrate or decline open proposals with clear rationale.',
          '- When response pressure rises, resolve one issue and verify pressure drops in the next regulator cycle.',
        ].join('\n'),
        format: 'markdown',
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  await composeOrganism(
    { parentId: projectRepository.organism.id, childId: repositoryIssueSensor.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: projectRepository.organism.id, childId: repositoryIssueVariable.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: projectRepository.organism.id, childId: repositoryResponsePolicy.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: projectRepository.organism.id, childId: repositoryProposalAction.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: projectRepository.organism.id, childId: repositoryWhy.organism.id, composedBy: devUserId },
    composeDeps,
  );

  // Community: Capital Community
  const capitalMap = await createOrganism(
    {
      name: 'Capital Map',
      contentTypeId: 'spatial-map' as ContentTypeId,
      payload: {
        entries: [],
        width: 2000,
        height: 2000,
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const capitalCommunity = await createOrganism(
    {
      name: 'Capital Community',
      contentTypeId: 'community' as ContentTypeId,
      payload: {
        description:
          'The initial capital boundary: a creative community with foundational institutions for governance, treasury, membership, and commons.',
        mapOrganismId: capitalMap.organism.id,
      },
      createdBy: devUserId,
    },
    createDeps,
  );

  await composeOrganism(
    { parentId: capitalCommunity.organism.id, childId: capitalMap.organism.id, composedBy: devUserId },
    composeDeps,
  );

  const capitalGovernment = await createOrganism(
    {
      name: 'Capital Government',
      contentTypeId: 'composition-reference' as ContentTypeId,
      payload: {
        entries: [],
        arrangementType: 'unordered',
      },
      createdBy: devUserId,
    },
    createDeps,
  );

  const capitalTreasury = await createOrganism(
    {
      name: 'Capital Treasury',
      contentTypeId: 'composition-reference' as ContentTypeId,
      payload: {
        entries: [],
        arrangementType: 'unordered',
      },
      createdBy: devUserId,
    },
    createDeps,
  );

  const capitalMembership = await createOrganism(
    {
      name: 'Capital Membership',
      contentTypeId: 'composition-reference' as ContentTypeId,
      payload: {
        entries: [],
        arrangementType: 'unordered',
      },
      createdBy: devUserId,
    },
    createDeps,
  );

  const capitalCommons = await createOrganism(
    {
      name: 'Capital Commons',
      contentTypeId: 'composition-reference' as ContentTypeId,
      payload: {
        entries: [],
        arrangementType: 'unordered',
      },
      createdBy: devUserId,
    },
    createDeps,
  );

  const capitalTechnology = await createOrganism(
    {
      name: 'Capital Technology',
      contentTypeId: 'composition-reference' as ContentTypeId,
      payload: {
        entries: [],
        arrangementType: 'unordered',
      },
      createdBy: devUserId,
    },
    createDeps,
  );

  const softwareSystem = await createOrganism(
    {
      name: 'Software System',
      contentTypeId: 'composition-reference' as ContentTypeId,
      payload: {
        entries: [],
        arrangementType: 'unordered',
      },
      createdBy: devUserId,
    },
    createDeps,
  );

  const communityForum = await createOrganism(
    {
      name: 'Community Forum',
      contentTypeId: 'thread' as ContentTypeId,
      payload: {
        title: 'Community Forum',
        appendOnly: true,
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const technologyProposalSensor = await createOrganism(
    {
      name: 'capital-technology-proposals-sensor',
      contentTypeId: 'sensor' as ContentTypeId,
      payload: {
        label: 'capital-technology-proposals',
        targetOrganismId: capitalTechnology.organism.id,
        metric: 'proposals',
        readings: [],
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const technologyLoadVariable = await createOrganism(
    {
      name: 'capital-technology-load-variable',
      contentTypeId: 'variable' as ContentTypeId,
      payload: {
        label: 'capital-technology-load',
        value: 0,
        unit: 'open-proposals',
        computedAt: container.identityGenerator.timestamp(),
        computation: {
          mode: 'observation-sum',
          sensorLabel: 'capital-technology-proposals',
          metric: 'proposals',
          windowSeconds: 7 * 24 * 60 * 60,
        },
        thresholds: {
          low: 4,
          critical: 7,
        },
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const technologyResponsePolicy = await createOrganism(
    {
      name: 'capital-technology-response-policy',
      contentTypeId: 'response-policy' as ContentTypeId,
      payload: {
        mode: 'variable-threshold',
        variableLabel: 'capital-technology-load',
        condition: 'above',
        threshold: 7,
        action: 'decline-all',
        reason: 'Technology load is above capacity. Prioritize reliability and integration.',
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const technologyTriageAction = await createOrganism(
    {
      name: 'capital-technology-triage-action',
      contentTypeId: 'action' as ContentTypeId,
      payload: {
        label: 'Open capital technology triage proposal',
        kind: 'open-proposal',
        executionMode: 'proposal-required',
        riskLevel: 'high',
        cooldownSeconds: 7 * 24 * 60 * 60,
        trigger: {
          responsePolicyOrganismId: technologyResponsePolicy.organism.id,
          whenDecision: 'decline',
        },
        config: {
          targetOrganismId: communityForum.organism.id,
          proposedContentTypeId: 'thread',
          proposedPayload: {
            author: devUserId,
            content:
              'Capital Technology triage recommendation: proposal pressure is elevated. Shift this week toward stabilization and integration.',
            timestamp: container.identityGenerator.timestamp(),
          },
          description: 'Technology triage proposal from capital technology loop',
        },
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const softwareSystemProposalSensor = await createOrganism(
    {
      name: 'software-system-proposals-sensor',
      contentTypeId: 'sensor' as ContentTypeId,
      payload: {
        label: 'software-system-proposals',
        targetOrganismId: softwareSystem.organism.id,
        metric: 'proposals',
        readings: [],
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const softwareSystemLoadVariable = await createOrganism(
    {
      name: 'software-system-load-variable',
      contentTypeId: 'variable' as ContentTypeId,
      payload: {
        label: 'software-system-load',
        value: 0,
        unit: 'open-proposals',
        computedAt: container.identityGenerator.timestamp(),
        computation: {
          mode: 'observation-sum',
          sensorLabel: 'software-system-proposals',
          metric: 'proposals',
          windowSeconds: 7 * 24 * 60 * 60,
        },
        thresholds: {
          low: 3,
          critical: 5,
        },
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const softwareSystemResponsePolicy = await createOrganism(
    {
      name: 'software-system-response-policy',
      contentTypeId: 'response-policy' as ContentTypeId,
      payload: {
        mode: 'variable-threshold',
        variableLabel: 'software-system-load',
        condition: 'above',
        threshold: 5,
        action: 'decline-all',
        reason: 'Software system load is above threshold. Stabilize before accepting additional mutations.',
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const softwareSystemStabilityAction = await createOrganism(
    {
      name: 'software-system-stability-action',
      contentTypeId: 'action' as ContentTypeId,
      payload: {
        label: 'Open software system stability proposal',
        kind: 'open-proposal',
        executionMode: 'proposal-required',
        riskLevel: 'high',
        cooldownSeconds: 7 * 24 * 60 * 60,
        trigger: {
          responsePolicyOrganismId: softwareSystemResponsePolicy.organism.id,
          whenDecision: 'decline',
        },
        config: {
          targetOrganismId: communityForum.organism.id,
          proposedContentTypeId: 'thread',
          proposedPayload: {
            author: devUserId,
            content:
              'Software System stability recommendation: pause non-essential changes and close out the current proposal queue.',
            timestamp: container.identityGenerator.timestamp(),
          },
          description: 'Stability proposal from software system loop',
        },
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const communityProposalSensor = await createOrganism(
    {
      name: 'capital-open-proposals-sensor',
      contentTypeId: 'sensor' as ContentTypeId,
      payload: {
        label: 'capital-open-proposals',
        targetOrganismId: capitalCommunity.organism.id,
        metric: 'proposals',
        readings: [],
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const communityParticipationSensor = await createOrganism(
    {
      name: 'capital-participation-sensor',
      contentTypeId: 'sensor' as ContentTypeId,
      payload: {
        label: 'capital-participation',
        targetOrganismId: capitalCommunity.organism.id,
        metric: 'state-changes',
        readings: [],
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const communityGovernanceLoadVariable = await createOrganism(
    {
      name: 'capital-governance-load-variable',
      contentTypeId: 'variable' as ContentTypeId,
      payload: {
        label: 'capital-governance-load',
        value: 0,
        unit: 'open-proposals',
        computedAt: container.identityGenerator.timestamp(),
        computation: {
          mode: 'observation-sum',
          sensorLabel: 'capital-open-proposals',
          metric: 'proposals',
          windowSeconds: 7 * 24 * 60 * 60,
        },
        thresholds: {
          low: 8,
          critical: 12,
        },
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const communityVitalityVariable = await createOrganism(
    {
      name: 'capital-community-vitality-variable',
      contentTypeId: 'variable' as ContentTypeId,
      payload: {
        label: 'capital-community-vitality',
        value: 0,
        unit: 'weekly-state-changes',
        computedAt: container.identityGenerator.timestamp(),
        computation: {
          mode: 'observation-sum',
          sensorLabel: 'capital-participation',
          metric: 'state-changes',
          windowSeconds: 7 * 24 * 60 * 60,
        },
        thresholds: {
          low: 6,
          critical: 3,
        },
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const communityCadenceResponsePolicy = await createOrganism(
    {
      name: 'capital-cadence-response-policy',
      contentTypeId: 'response-policy' as ContentTypeId,
      payload: {
        mode: 'variable-threshold',
        variableLabel: 'capital-governance-load',
        condition: 'above',
        threshold: 12,
        action: 'decline-all',
        reason: 'Governance load is above weekly capacity. Prioritize triage and integrations.',
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const communityVitalityResponsePolicy = await createOrganism(
    {
      name: 'capital-vitality-response-policy',
      contentTypeId: 'response-policy' as ContentTypeId,
      payload: {
        mode: 'variable-threshold',
        variableLabel: 'capital-community-vitality',
        condition: 'below',
        threshold: 6,
        action: 'decline-all',
        reason: 'Community vitality is below baseline. Prioritize participation actions.',
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const communityTriageAction = await createOrganism(
    {
      name: 'capital-weekly-triage-action',
      contentTypeId: 'action' as ContentTypeId,
      payload: {
        label: 'Open weekly governance triage proposal',
        kind: 'open-proposal',
        executionMode: 'proposal-required',
        riskLevel: 'high',
        cooldownSeconds: 7 * 24 * 60 * 60,
        trigger: {
          responsePolicyOrganismId: communityCadenceResponsePolicy.organism.id,
          whenDecision: 'decline',
        },
        config: {
          targetOrganismId: communityForum.organism.id,
          proposedContentTypeId: 'thread',
          proposedPayload: {
            author: devUserId,
            content:
              'Weekly triage recommendation: governance load is high. Prioritize integrating or declining open proposals before new work.',
            timestamp: container.identityGenerator.timestamp(),
          },
          description: 'Weekly triage proposal from capital cadence loop',
        },
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const communityParticipationAction = await createOrganism(
    {
      name: 'capital-participation-invitation-action',
      contentTypeId: 'action' as ContentTypeId,
      payload: {
        label: 'Open community participation invitation proposal',
        kind: 'open-proposal',
        executionMode: 'proposal-required',
        riskLevel: 'high',
        cooldownSeconds: 7 * 24 * 60 * 60,
        trigger: {
          responsePolicyOrganismId: communityVitalityResponsePolicy.organism.id,
          whenDecision: 'decline',
        },
        config: {
          targetOrganismId: communityForum.organism.id,
          proposedContentTypeId: 'thread',
          proposedPayload: {
            author: devUserId,
            content:
              'Steward invitation: share one current work and one blocker this week so we can coordinate support.',
            timestamp: container.identityGenerator.timestamp(),
          },
          description: 'Participation invitation proposal from community vitality loop',
        },
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const capitalCommunityWhy = await createOrganism(
    {
      name: 'capital-community-why',
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: [
          '# Capital Community — Why',
          '',
          'This boundary keeps culture, institutions, and regulation coherent while the community grows.',
          '',
          '## Next steps',
          '- Run a weekly cadence to review governance load and community vitality.',
          '- Keep institution boundaries legible on the map and in composition.',
          '- Integrate proposals with rationale in the community forum thread.',
        ].join('\n'),
        format: 'markdown',
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const capitalTechnologyWhy = await createOrganism(
    {
      name: 'capital-technology-why',
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: [
          '# Capital Technology — Why',
          '',
          'This institution tends product delivery, reliability, and platform continuity.',
          '',
          '## Next steps',
          '- Shift between stabilization and growth based on technology load.',
          '- Keep software-system work visible and scoped through proposals.',
          '- Publish weekly technology triage notes in the community forum.',
        ].join('\n'),
        format: 'markdown',
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const softwareSystemWhy = await createOrganism(
    {
      name: 'software-system-why',
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: [
          '# Software System — Why',
          '',
          'This system boundary coordinates the technical organisms required to ship Omnilith safely.',
          '',
          '## Next steps',
          '- Keep proposal queue pressure below threshold.',
          '- Stabilize before accepting additional high-risk mutations.',
          '- Keep repository loop signals current and review weekly.',
        ].join('\n'),
        format: 'markdown',
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const communityText = await createOrganism(
    {
      name: 'Listening Practice',
      contentTypeId: 'text' as ContentTypeId,
      payload: {
        content: [
          '# Listening Practice',
          '',
          'Go outside. Close your eyes.',
          'Count the layers of sound.',
          'The ones you can name. The ones you cannot.',
          '',
          'Come back and write down what you heard.',
        ].join('\n'),
        format: 'markdown',
      },
      createdBy: devUserId,
      openTrunk: true,
    },
    createDeps,
  );

  const communityAudio = await createOrganism(
    {
      name: 'Rain on Tin',
      contentTypeId: 'audio' as ContentTypeId,
      payload: {
        fileReference: 'dev/audio/rain-on-tin.flac',
        durationSeconds: 423,
        format: 'flac',
        sampleRate: 48000,
        metadata: { title: 'Rain on Tin', artist: 'Member Recording' },
      },
      createdBy: devUserId,
    },
    createDeps,
  );

  await composeOrganism(
    { parentId: capitalCommunity.organism.id, childId: communityText.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: capitalCommunity.organism.id, childId: communityAudio.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: capitalCommunity.organism.id, childId: heroJourney.sceneOrganismId, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: capitalCommunity.organism.id, childId: weeklyUpdates.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: capitalCommunity.organism.id, childId: capitalTechnology.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: capitalCommunity.organism.id, childId: capitalGovernment.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: capitalCommunity.organism.id, childId: capitalTreasury.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: capitalCommunity.organism.id, childId: capitalMembership.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: capitalCommunity.organism.id, childId: capitalCommons.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: capitalCommunity.organism.id, childId: communityForum.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: capitalCommunity.organism.id, childId: communityProposalSensor.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    {
      parentId: capitalCommunity.organism.id,
      childId: communityParticipationSensor.organism.id,
      composedBy: devUserId,
    },
    composeDeps,
  );
  await composeOrganism(
    {
      parentId: capitalCommunity.organism.id,
      childId: communityGovernanceLoadVariable.organism.id,
      composedBy: devUserId,
    },
    composeDeps,
  );
  await composeOrganism(
    { parentId: capitalCommunity.organism.id, childId: communityVitalityVariable.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    {
      parentId: capitalCommunity.organism.id,
      childId: communityCadenceResponsePolicy.organism.id,
      composedBy: devUserId,
    },
    composeDeps,
  );
  await composeOrganism(
    {
      parentId: capitalCommunity.organism.id,
      childId: communityVitalityResponsePolicy.organism.id,
      composedBy: devUserId,
    },
    composeDeps,
  );
  await composeOrganism(
    { parentId: capitalCommunity.organism.id, childId: communityTriageAction.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    {
      parentId: capitalCommunity.organism.id,
      childId: communityParticipationAction.organism.id,
      composedBy: devUserId,
    },
    composeDeps,
  );
  await composeOrganism(
    { parentId: capitalCommunity.organism.id, childId: capitalCommunityWhy.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: capitalTechnology.organism.id, childId: softwareSystem.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: capitalTechnology.organism.id, childId: technologyProposalSensor.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: capitalTechnology.organism.id, childId: technologyLoadVariable.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: capitalTechnology.organism.id, childId: technologyResponsePolicy.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: capitalTechnology.organism.id, childId: technologyTriageAction.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: capitalTechnology.organism.id, childId: capitalTechnologyWhy.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: softwareSystem.organism.id, childId: softwareSystemProposalSensor.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: softwareSystem.organism.id, childId: softwareSystemLoadVariable.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: softwareSystem.organism.id, childId: softwareSystemResponsePolicy.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: softwareSystem.organism.id, childId: softwareSystemStabilityAction.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: softwareSystem.organism.id, childId: softwareSystemWhy.organism.id, composedBy: devUserId },
    composeDeps,
  );
  await composeOrganism(
    { parentId: softwareSystem.organism.id, childId: projectRepository.organism.id, composedBy: devUserId },
    composeDeps,
  );

  await appendState(
    {
      organismId: capitalMap.organism.id,
      contentTypeId: 'spatial-map' as ContentTypeId,
      payload: {
        entries: [
          // Civic district
          { organismId: capitalGovernment.organism.id, x: 900, y: 1400, size: 1.22, emphasis: 0.92 },
          { organismId: capitalTreasury.organism.id, x: 900, y: 2300, size: 1.15, emphasis: 0.9 },
          { organismId: capitalMembership.organism.id, x: 1300, y: 1850, size: 1.08, emphasis: 0.88 },
          { organismId: capitalCommons.organism.id, x: 500, y: 1850, size: 1.08, emphasis: 0.88 },
          { organismId: communityForum.organism.id, x: 1300, y: 1200, size: 1.06, emphasis: 0.86 },
          { organismId: capitalCommunityWhy.organism.id, x: 1650, y: 1600, size: 0.96, emphasis: 0.78 },
          // Cultural district
          { organismId: communityText.organism.id, x: 1700, y: 3400, size: 1.04, emphasis: 0.84 },
          { organismId: communityAudio.organism.id, x: 2300, y: 3800, size: 1.12, emphasis: 0.9 },
          { organismId: heroJourney.sceneOrganismId, x: 3000, y: 2250, size: 1.18, emphasis: 0.95 },
          { organismId: weeklyUpdates.organism.id, x: 3400, y: 3900, size: 1.04, emphasis: 0.82 },
          // Technology district
          { organismId: capitalTechnology.organism.id, x: 4300, y: 1600, size: 1.16, emphasis: 0.9 },
          { organismId: capitalTechnologyWhy.organism.id, x: 4620, y: 1120, size: 0.96, emphasis: 0.78 },
          { organismId: softwareSystem.organism.id, x: 5050, y: 1900, size: 1.04, emphasis: 0.84 },
          { organismId: softwareSystemWhy.organism.id, x: 5380, y: 1600, size: 0.94, emphasis: 0.76 },
          { organismId: projectRepository.organism.id, x: 5650, y: 2150, size: 0.98, emphasis: 0.8 },
          { organismId: repositoryWhy.organism.id, x: 5880, y: 2550, size: 0.9, emphasis: 0.74 },
        ],
        width: 6000,
        height: 4500,
      },
      appendedBy: devUserId,
    },
    appendDeps,
  );

  await container.relationshipRepository.save({
    id: container.identityGenerator.relationshipId(),
    type: 'membership',
    userId: demoUserId,
    organismId: capitalCommunity.organism.id,
    role: 'member',
    createdAt: container.identityGenerator.timestamp(),
  });

  await container.visibilityRepository.save({
    organismId: capitalCommunity.organism.id,
    level: 'private',
    updatedAt: container.identityGenerator.timestamp(),
  });
  await container.visibilityRepository.save({
    organismId: capitalMap.organism.id,
    level: 'members',
    updatedAt: container.identityGenerator.timestamp(),
  });
  await container.visibilityRepository.save({
    organismId: communityText.organism.id,
    level: 'members',
    updatedAt: container.identityGenerator.timestamp(),
  });
  await container.visibilityRepository.save({
    organismId: communityAudio.organism.id,
    level: 'members',
    updatedAt: container.identityGenerator.timestamp(),
  });

  const worldMapRow = await container.db.select().from(platformConfig).where(eq(platformConfig.key, 'world_map_id'));
  if (worldMapRow.length === 0) {
    throw new Error('World map not found — run seedWorldMap first');
  }
  const worldMapId = worldMapRow[0].value as OrganismId;

  await appendState(
    {
      organismId: worldMapId,
      contentTypeId: 'spatial-map' as ContentTypeId,
      payload: {
        entries: [
          { organismId: heroJourney.sceneOrganismId, x: 2440, y: 2360, size: 1.6, emphasis: 0.96 },
          { organismId: weeklyUpdates.organism.id, x: 2920, y: 2620, size: 1.2, emphasis: 0.82 },
          { organismId: capitalCommunity.organism.id, x: 2650, y: 2910, size: 1.35, emphasis: 0.9 },
        ],
        width: 5000,
        height: 5000,
      },
      appendedBy: 'system' as UserId,
    },
    appendDeps,
  );

  await container.db.insert(platformConfig).values({
    key: V1_DEMO_SEED_KEY,
    value: new Date().toISOString(),
  });

  console.log(`  Hero's Journey: ${heroJourney.sceneOrganismId}`);
  console.log(`  Weekly Updates: ${weeklyUpdates.organism.id}`);
  console.log(`  Omnilith Repository: ${projectRepository.organism.id}`);
  console.log(`  Capital Government: ${capitalGovernment.organism.id}`);
  console.log(`  Capital Treasury: ${capitalTreasury.organism.id}`);
  console.log(`  Capital Membership: ${capitalMembership.organism.id}`);
  console.log(`  Capital Commons: ${capitalCommons.organism.id}`);
  console.log(`  Capital Technology: ${capitalTechnology.organism.id}`);
  console.log(`  Software System: ${softwareSystem.organism.id}`);
  console.log(`  Community Forum: ${communityForum.organism.id}`);
  console.log(`  capital-cadence-response-policy: ${communityCadenceResponsePolicy.organism.id}`);
  console.log(`  capital-vitality-response-policy: ${communityVitalityResponsePolicy.organism.id}`);
  console.log(`  capital-technology-response-policy: ${technologyResponsePolicy.organism.id}`);
  console.log(`  software-system-response-policy: ${softwareSystemResponsePolicy.organism.id}`);
  console.log(`  capital-community-why: ${capitalCommunityWhy.organism.id}`);
  console.log(`  capital-technology-why: ${capitalTechnologyWhy.organism.id}`);
  console.log(`  software-system-why: ${softwareSystemWhy.organism.id}`);
  console.log(`  omnilith-repository-why: ${repositoryWhy.organism.id}`);
  console.log(`  Community "Capital Community": ${capitalCommunity.organism.id} (private)`);
  console.log(`  Dev user: ${DEV_USER_EMAIL} / ${DEV_USER_PASSWORD} (session: ${DEV_SESSION_ID})`);
  console.log(`  Demo user: ${DEMO_USER_EMAIL} / ${DEMO_USER_PASSWORD}`);
  console.log('V1 demo seed complete.');
}
