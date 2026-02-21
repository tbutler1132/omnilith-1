/**
 * Generic regulator runtime — computes variables, refreshes policy snapshots,
 * and executes composed actions.
 *
 * A boundary becomes cybernetic through composition: sensor, variable,
 * response-policy, and action organisms composed together. This runtime
 * executes one deterministic cycle without introducing domain specifics
 * into the kernel.
 */

import { createHash, randomUUID } from 'node:crypto';
import type {
  ActionPayload,
  GitHubPrActionConfig,
  OpenProposalActionConfig,
  ResponsePolicyPayload,
  VariablePayload,
} from '@omnilith/content-types';
import type { ContentTypeId, OrganismId, Timestamp, UserId } from '@omnilith/kernel';
import { appendState, openProposal } from '@omnilith/kernel';
import { eq } from 'drizzle-orm';
import type { Container } from '../container.js';
import { composition, regulatorActionExecutions, regulatorRuntimeEvents } from '../db/schema.js';
import { isRepositoryAllowed, parseGitHubAllowlist } from '../github/allowlist.js';
import {
  type GitHubPullRequestGateway,
  type GitHubPullRequestRecord,
  GitHubRestPullRequestGateway,
} from '../github/github-pull-request-gateway.js';

interface SensorSnapshot {
  readonly organismId: OrganismId;
  readonly label: string;
}

interface ManagedVariableSnapshot {
  readonly organismId: OrganismId;
  readonly payload: VariablePayload;
}

interface ResponsePolicySnapshot {
  readonly organismId: OrganismId;
  readonly payload: ResponsePolicyPayload;
}

interface ActionSnapshot {
  readonly organismId: OrganismId;
  readonly payload: ActionPayload;
}

interface ResponsePolicyDecision {
  readonly decision: 'pass' | 'decline';
  readonly currentVariableValue?: number;
}

interface RuntimeEnvironment {
  readonly repositoryAllowlist: ReadonlySet<string>;
  readonly allowedBaseBranches: ReadonlySet<string>;
  readonly allowedTargetOrganismIds: ReadonlySet<string>;
}

interface RuntimeEventInput {
  readonly cycleId: string;
  readonly stage: string;
  readonly payload: Record<string, unknown>;
  readonly boundaryOrganismId?: OrganismId;
  readonly actionOrganismId?: OrganismId;
  readonly executionId?: string;
}

interface ReservedExecution {
  readonly executionId: string;
  readonly reserved: boolean;
  readonly attemptCount: number;
}

export interface BoundaryCycleResult {
  readonly boundaryOrganismId: OrganismId;
  readonly variableUpdates: number;
  readonly responsePolicyUpdates: number;
  readonly skippedManagedVariables: number;
  readonly directActionExecutions: number;
  readonly proposalActionsOpened: number;
  readonly declinedActions: number;
  readonly failedActions: number;
}

export interface RegulatorRuntimeOptions {
  readonly boundaryOrganismIds?: ReadonlyArray<OrganismId>;
  readonly runnerUserId?: UserId;
  readonly githubPullRequestGateway?: GitHubPullRequestGateway;
}

export interface RegulatorCycleResult {
  readonly cycleId: string;
  readonly boundariesProcessed: number;
  readonly variableUpdates: number;
  readonly responsePolicyUpdates: number;
  readonly skippedManagedVariables: number;
  readonly directActionExecutions: number;
  readonly proposalActionsOpened: number;
  readonly declinedActions: number;
  readonly failedActions: number;
  readonly boundaries: ReadonlyArray<BoundaryCycleResult>;
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

function nowEpochMs(): number {
  return Date.now();
}

function hasDatabase(container: Container): boolean {
  return Boolean(container.db && typeof container.db === 'object');
}

function toVariablePayload(payload: unknown): VariablePayload | undefined {
  const object = asObject(payload);
  if (!object) {
    return undefined;
  }

  const label = asNonEmptyString(object.label);
  const value = asFiniteNumber(object.value);
  const computedAt = asFiniteNumber(object.computedAt);

  if (!label || value === undefined || computedAt === undefined) {
    return undefined;
  }

  return payload as VariablePayload;
}

function toResponsePolicyPayload(payload: unknown): ResponsePolicyPayload | undefined {
  const object = asObject(payload);
  if (!object) {
    return undefined;
  }

  if (object.mode !== 'variable-threshold') {
    return undefined;
  }

  if (!asNonEmptyString(object.variableLabel)) {
    return undefined;
  }

  return payload as ResponsePolicyPayload;
}

function toActionPayload(payload: unknown): ActionPayload | undefined {
  const object = asObject(payload);
  if (!object) {
    return undefined;
  }

  if (!asNonEmptyString(object.label)) {
    return undefined;
  }

  const kind = object.kind;
  if (kind !== 'github-pr' && kind !== 'open-proposal') {
    return undefined;
  }

  if (object.executionMode !== 'direct-low-risk' && object.executionMode !== 'proposal-required') {
    return undefined;
  }

  if (object.riskLevel !== 'low' && object.riskLevel !== 'high') {
    return undefined;
  }

  const trigger = asObject(object.trigger);
  if (!trigger) {
    return undefined;
  }

  if (!asNonEmptyString(trigger.responsePolicyOrganismId)) {
    return undefined;
  }

  if (trigger.whenDecision !== 'pass' && trigger.whenDecision !== 'decline') {
    return undefined;
  }

  const config = asObject(object.config);
  if (!config) {
    return undefined;
  }

  if (kind === 'github-pr') {
    if (
      !asNonEmptyString(config.owner) ||
      !asNonEmptyString(config.repository) ||
      !asNonEmptyString(config.baseBranch) ||
      !asNonEmptyString(config.headBranch) ||
      !asNonEmptyString(config.title) ||
      !asNonEmptyString(config.body)
    ) {
      return undefined;
    }
  }

  if (kind === 'open-proposal') {
    if (
      !asNonEmptyString(config.targetOrganismId) ||
      !asNonEmptyString(config.proposedContentTypeId) ||
      config.proposedPayload === undefined
    ) {
      return undefined;
    }

    if (config.description !== undefined && typeof config.description !== 'string') {
      return undefined;
    }
  }

  return payload as ActionPayload;
}

function toSensorSnapshot(organismId: OrganismId, payload: unknown): SensorSnapshot | undefined {
  const object = asObject(payload);
  if (!object) {
    return undefined;
  }

  const label = asNonEmptyString(object.label);
  if (!label) {
    return undefined;
  }

  return {
    organismId,
    label,
  };
}

function computeBoundariesFromRows(rows: ReadonlyArray<{ readonly parentId: string }>): ReadonlyArray<OrganismId> {
  const unique = new Set<string>();
  for (const row of rows) {
    unique.add(row.parentId);
  }

  return [...unique] as OrganismId[];
}

async function discoverBoundaryOrganisms(container: Container): Promise<ReadonlyArray<OrganismId>> {
  if (!hasDatabase(container)) {
    throw new Error('No boundary organisms specified and database boundary discovery is unavailable');
  }

  const rows = await container.db.select({ parentId: composition.parentId }).from(composition);
  return computeBoundariesFromRows(rows as ReadonlyArray<{ readonly parentId: string }>);
}

function coerceRunnerUserId(options: RegulatorRuntimeOptions): UserId {
  if (options.runnerUserId) {
    return options.runnerUserId;
  }

  return 'system' as UserId;
}

function normalizeBoundaryList(values: ReadonlyArray<OrganismId>): ReadonlyArray<OrganismId> {
  const unique = new Set(values.map((value) => value as string));
  return [...unique] as OrganismId[];
}

function parseCsvSet(raw: string | undefined): ReadonlySet<string> {
  if (!raw) {
    return new Set();
  }

  return new Set(
    raw
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0),
  );
}

function runtimeEnvironmentFromEnv(): RuntimeEnvironment {
  return {
    repositoryAllowlist: parseGitHubAllowlist(process.env.GITHUB_ALLOWED_REPOS),
    allowedBaseBranches: parseCsvSet(process.env.REGULATOR_ALLOWED_BASE_BRANCHES),
    allowedTargetOrganismIds: parseCsvSet(process.env.REGULATOR_ALLOWED_TARGET_ORGANISM_IDS),
  };
}

function resolvePullRequestGateway(options: RegulatorRuntimeOptions): GitHubPullRequestGateway {
  if (options.githubPullRequestGateway) {
    return options.githubPullRequestGateway;
  }

  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error('GITHUB_TOKEN is required for github-pr action execution');
  }

  const apiBaseUrl = process.env.GITHUB_API_BASE_URL?.trim() || undefined;
  return new GitHubRestPullRequestGateway(token, apiBaseUrl);
}

async function resolveBoundaryChildren(container: Container, boundaryOrganismId: OrganismId) {
  const records = await container.compositionRepository.findChildren(boundaryOrganismId);

  const ordered = [...records].sort((left, right) => {
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

  const states = await Promise.all(
    ordered.map(async (record) => ({
      childId: record.childId,
      state: await container.stateRepository.findCurrentByOrganismId(record.childId),
    })),
  );

  return states;
}

async function persistRuntimeEvent(container: Container, input: RuntimeEventInput): Promise<void> {
  if (!hasDatabase(container)) {
    return;
  }

  await container.db.insert(regulatorRuntimeEvents).values({
    id: randomUUID(),
    cycleId: input.cycleId,
    stage: input.stage,
    boundaryOrganismId: input.boundaryOrganismId,
    actionOrganismId: input.actionOrganismId,
    executionId: input.executionId,
    payload: input.payload,
    occurredAt: new Date(),
  });
}

async function computeObservationSum(
  container: Container,
  sensorOrganismId: OrganismId,
  metric: string,
  windowSeconds: number | undefined,
): Promise<number> {
  const events = await container.eventRepository.findByOrganismId(sensorOrganismId, 'organism.observed');
  const now = nowEpochMs();
  const windowStart = windowSeconds !== undefined ? now - windowSeconds * 1000 : undefined;

  let total = 0;
  for (const event of events) {
    const payload = asObject(event.payload);
    if (!payload) {
      continue;
    }

    if (payload.metric !== metric) {
      continue;
    }

    const sampledAt = asFiniteNumber(payload.sampledAt);
    if (windowStart !== undefined && sampledAt !== undefined && sampledAt < windowStart) {
      continue;
    }

    const value = asFiniteNumber(payload.value);
    if (value === undefined) {
      continue;
    }

    total += value;
  }

  return total;
}

function applyClamp(value: number, minValue: number | undefined, maxValue: number | undefined): number {
  let next = value;
  if (minValue !== undefined) {
    next = Math.max(minValue, next);
  }
  if (maxValue !== undefined) {
    next = Math.min(maxValue, next);
  }
  return next;
}

function evaluateResponsePolicyDecision(payload: ResponsePolicyPayload): ResponsePolicyDecision {
  if (payload.currentVariableValue === undefined) {
    return { decision: 'pass' };
  }

  const triggered =
    payload.condition === 'below'
      ? payload.currentVariableValue < payload.threshold
      : payload.currentVariableValue > payload.threshold;

  if (triggered) {
    return {
      decision: payload.action === 'decline-all' ? 'decline' : 'pass',
      currentVariableValue: payload.currentVariableValue,
    };
  }

  return {
    decision: payload.action === 'decline-all' ? 'pass' : 'decline',
    currentVariableValue: payload.currentVariableValue,
  };
}

async function updateManagedVariable(
  container: Container,
  managedVariable: ManagedVariableSnapshot,
  sensorByLabel: ReadonlyMap<string, SensorSnapshot>,
  runnerUserId: UserId,
): Promise<{ updated: boolean; value: number; skipped: boolean }> {
  const computation = managedVariable.payload.computation;
  if (!computation || computation.mode !== 'observation-sum') {
    return { updated: false, value: managedVariable.payload.value, skipped: true };
  }

  const sensor = sensorByLabel.get(computation.sensorLabel);
  if (!sensor) {
    return { updated: false, value: managedVariable.payload.value, skipped: true };
  }

  const rawValue = await computeObservationSum(
    container,
    sensor.organismId,
    computation.metric,
    computation.windowSeconds,
  );
  const computedValue = applyClamp(rawValue, computation.clampMin, computation.clampMax);

  if (managedVariable.payload.value === computedValue) {
    return { updated: false, value: computedValue, skipped: false };
  }

  const now = container.identityGenerator.timestamp();
  const nextPayload: VariablePayload = {
    ...managedVariable.payload,
    value: computedValue,
    computedAt: now as Timestamp,
    computedFrom: `observation-sum:${computation.sensorLabel}:${computation.metric}`,
  };

  await appendState(
    {
      organismId: managedVariable.organismId,
      contentTypeId: 'variable' as ContentTypeId,
      payload: nextPayload,
      appendedBy: runnerUserId,
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

  return { updated: true, value: computedValue, skipped: false };
}

async function updateResponsePolicy(
  container: Container,
  responsePolicy: ResponsePolicySnapshot,
  variableValueByLabel: ReadonlyMap<string, number>,
  runnerUserId: UserId,
): Promise<{ updated: boolean; nextPayload: ResponsePolicyPayload }> {
  const nextValue = variableValueByLabel.get(responsePolicy.payload.variableLabel);
  if (nextValue === undefined) {
    return { updated: false, nextPayload: responsePolicy.payload };
  }

  const nextPayload: ResponsePolicyPayload = {
    ...responsePolicy.payload,
    currentVariableValue: nextValue,
  };

  if (responsePolicy.payload.currentVariableValue === nextValue) {
    return { updated: false, nextPayload };
  }

  await appendState(
    {
      organismId: responsePolicy.organismId,
      contentTypeId: 'response-policy' as ContentTypeId,
      payload: nextPayload,
      appendedBy: runnerUserId,
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

  return { updated: true, nextPayload };
}

function actionRequiresProposal(action: ActionPayload): boolean {
  return action.executionMode === 'proposal-required' || action.riskLevel === 'high';
}

function isCooldownActive(action: ActionPayload): boolean {
  const cooldownSeconds = action.cooldownSeconds ?? 300;
  if (cooldownSeconds <= 0 || action.lastExecutedAt === undefined) {
    return false;
  }

  return nowEpochMs() - action.lastExecutedAt < cooldownSeconds * 1000;
}

function isBaseBranchAllowed(allowedBaseBranches: ReadonlySet<string>, baseBranch: string): boolean {
  if (allowedBaseBranches.size === 0) {
    return true;
  }

  return allowedBaseBranches.has(baseBranch);
}

function isTargetOrganismAllowed(allowedTargetOrganismIds: ReadonlySet<string>, targetOrganismId: string): boolean {
  if (allowedTargetOrganismIds.size === 0) {
    return true;
  }

  return allowedTargetOrganismIds.has(targetOrganismId);
}

function computeActionIdempotencyKey(
  boundaryOrganismId: OrganismId,
  actionOrganismId: OrganismId,
  actionPayload: ActionPayload,
  triggerDecision: ResponsePolicyDecision,
): string {
  const stablePayload = JSON.stringify({
    boundaryOrganismId,
    actionOrganismId,
    kind: actionPayload.kind,
    executionMode: actionPayload.executionMode,
    riskLevel: actionPayload.riskLevel,
    trigger: actionPayload.trigger,
    config: actionPayload.config,
    decision: triggerDecision.decision,
    currentVariableValue: triggerDecision.currentVariableValue,
  });

  return createHash('sha256').update(stablePayload).digest('hex');
}

async function reserveActionExecution(
  container: Container,
  boundaryOrganismId: OrganismId,
  actionOrganismId: OrganismId,
  triggerPolicyOrganismId: OrganismId,
  executionMode: string,
  idempotencyKey: string,
): Promise<ReservedExecution> {
  if (!hasDatabase(container)) {
    return {
      executionId: `mem-${idempotencyKey}`,
      reserved: true,
      attemptCount: 1,
    };
  }

  const now = new Date();

  const inserted = await container.db
    .insert(regulatorActionExecutions)
    .values({
      id: randomUUID(),
      boundaryOrganismId,
      actionOrganismId,
      triggerPolicyOrganismId,
      executionMode,
      status: 'processing',
      idempotencyKey,
      attemptCount: 1,
      startedAt: now,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: regulatorActionExecutions.idempotencyKey })
    .returning({
      id: regulatorActionExecutions.id,
      attemptCount: regulatorActionExecutions.attemptCount,
    });

  if (inserted.length > 0) {
    return {
      executionId: inserted[0].id,
      reserved: true,
      attemptCount: inserted[0].attemptCount,
    };
  }

  const existing = await container.db
    .select({
      id: regulatorActionExecutions.id,
      status: regulatorActionExecutions.status,
      attemptCount: regulatorActionExecutions.attemptCount,
    })
    .from(regulatorActionExecutions)
    .where(eq(regulatorActionExecutions.idempotencyKey, idempotencyKey))
    .limit(1);

  const row = existing[0];
  if (!row) {
    throw new Error(`Failed to reserve action execution for key ${idempotencyKey}`);
  }

  if (row.status === 'succeeded' || row.status === 'proposal-created' || row.status === 'declined') {
    return {
      executionId: row.id,
      reserved: false,
      attemptCount: row.attemptCount,
    };
  }

  const nextAttemptCount = row.attemptCount + 1;

  await container.db
    .update(regulatorActionExecutions)
    .set({
      status: 'processing',
      attemptCount: nextAttemptCount,
      startedAt: now,
      updatedAt: now,
      lastError: null,
    })
    .where(eq(regulatorActionExecutions.id, row.id));

  return {
    executionId: row.id,
    reserved: true,
    attemptCount: nextAttemptCount,
  };
}

async function completeActionExecution(
  container: Container,
  executionId: string,
  status: string,
  lastError: string | null,
  result: Record<string, unknown> | null,
): Promise<void> {
  if (!hasDatabase(container)) {
    return;
  }

  const now = new Date();

  await container.db
    .update(regulatorActionExecutions)
    .set({
      status,
      lastError,
      result,
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(regulatorActionExecutions.id, executionId));
}

async function appendActionExecutionMetadata(
  container: Container,
  actionSnapshot: ActionSnapshot,
  runnerUserId: UserId,
  idempotencyKey: string,
): Promise<void> {
  const now = container.identityGenerator.timestamp();
  const nextPayload: ActionPayload = {
    ...actionSnapshot.payload,
    lastExecutedAt: now as Timestamp,
    lastExecutionKey: idempotencyKey,
  };

  await appendState(
    {
      organismId: actionSnapshot.organismId,
      contentTypeId: 'action' as ContentTypeId,
      payload: nextPayload,
      appendedBy: runnerUserId,
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
}

function formatActionProposalBody(
  boundaryOrganismId: OrganismId,
  actionSnapshot: ActionSnapshot,
  triggerDecision: ResponsePolicyDecision,
): string {
  const header = [
    '# Regulator Action Proposal',
    '',
    `Boundary organism: ${boundaryOrganismId}`,
    `Action organism: ${actionSnapshot.organismId}`,
    `Action label: ${actionSnapshot.payload.label}`,
    `Trigger decision: ${triggerDecision.decision}`,
    `Current variable value: ${triggerDecision.currentVariableValue ?? 'unknown'}`,
    '',
  ];

  if (actionSnapshot.payload.kind === 'github-pr') {
    const config = actionSnapshot.payload.config as GitHubPrActionConfig;
    return [
      ...header,
      '## Proposed GitHub PR',
      `- Repository: ${config.owner}/${config.repository}`,
      `- Base branch: ${config.baseBranch}`,
      `- Head branch: ${config.headBranch}`,
      `- Title: ${config.title}`,
      '',
      '```markdown',
      config.body,
      '```',
    ].join('\n');
  }

  const config = actionSnapshot.payload.config as OpenProposalActionConfig;
  return [
    ...header,
    '## Proposed Internal Proposal',
    `- Target organism: ${config.targetOrganismId}`,
    `- Proposed content type: ${config.proposedContentTypeId}`,
    `- Description: ${config.description ?? 'Regulator follow-up proposal'}`,
    '',
    '```json',
    JSON.stringify(config.proposedPayload, null, 2),
    '```',
  ].join('\n');
}

async function openActionExecutionProposal(
  container: Container,
  boundaryOrganismId: OrganismId,
  actionSnapshot: ActionSnapshot,
  triggerDecision: ResponsePolicyDecision,
  runnerUserId: UserId,
): Promise<string> {
  const proposal = await openProposal(
    {
      organismId: boundaryOrganismId,
      proposedContentTypeId: 'text' as ContentTypeId,
      proposedPayload: {
        content: formatActionProposalBody(boundaryOrganismId, actionSnapshot, triggerDecision),
        format: 'markdown',
      },
      description: `Regulator action proposal: ${actionSnapshot.payload.label}`,
      proposedBy: runnerUserId,
    },
    {
      organismRepository: container.organismRepository,
      stateRepository: container.stateRepository,
      proposalRepository: container.proposalRepository,
      contentTypeRegistry: container.contentTypeRegistry,
      eventPublisher: container.eventPublisher,
      identityGenerator: container.identityGenerator,
      visibilityRepository: container.visibilityRepository,
      relationshipRepository: container.relationshipRepository,
      compositionRepository: container.compositionRepository,
    },
  );

  return proposal.id;
}

async function executeGitHubPrAction(
  actionPayload: ActionPayload,
  runtimeEnvironment: RuntimeEnvironment,
  gateway: GitHubPullRequestGateway,
): Promise<{ readonly record: GitHubPullRequestRecord; readonly existed: boolean }> {
  const config = actionPayload.config as GitHubPrActionConfig;

  if (!isRepositoryAllowed(runtimeEnvironment.repositoryAllowlist, { owner: config.owner, name: config.repository })) {
    throw new Error(`Repository ${config.owner}/${config.repository} is not allowlisted`);
  }

  if (!isBaseBranchAllowed(runtimeEnvironment.allowedBaseBranches, config.baseBranch)) {
    throw new Error(`Base branch ${config.baseBranch} is not allowlisted`);
  }

  const existing = await gateway.findOpenPullRequestByHead({
    owner: config.owner,
    repository: config.repository,
    headBranch: config.headBranch,
    baseBranch: config.baseBranch,
  });

  if (existing) {
    return { record: existing, existed: true };
  }

  const created = await gateway.createPullRequest({
    owner: config.owner,
    repository: config.repository,
    title: config.title,
    body: config.body,
    baseBranch: config.baseBranch,
    headBranch: config.headBranch,
    draft: config.draft,
  });

  return { record: created, existed: false };
}

async function executeOpenProposalAction(
  container: Container,
  actionPayload: ActionPayload,
  runnerUserId: UserId,
  runtimeEnvironment: RuntimeEnvironment,
): Promise<{ readonly proposalId: string }> {
  const config = actionPayload.config as OpenProposalActionConfig;

  if (!isTargetOrganismAllowed(runtimeEnvironment.allowedTargetOrganismIds, config.targetOrganismId)) {
    throw new Error(`Target organism ${config.targetOrganismId} is not allowlisted`);
  }

  const proposal = await openProposal(
    {
      organismId: config.targetOrganismId as OrganismId,
      proposedContentTypeId: config.proposedContentTypeId as ContentTypeId,
      proposedPayload: config.proposedPayload,
      description: config.description ?? `Regulator action: ${actionPayload.label}`,
      proposedBy: runnerUserId,
    },
    {
      organismRepository: container.organismRepository,
      stateRepository: container.stateRepository,
      proposalRepository: container.proposalRepository,
      contentTypeRegistry: container.contentTypeRegistry,
      eventPublisher: container.eventPublisher,
      identityGenerator: container.identityGenerator,
      visibilityRepository: container.visibilityRepository,
      relationshipRepository: container.relationshipRepository,
      compositionRepository: container.compositionRepository,
    },
  );

  return { proposalId: proposal.id };
}

async function executeAction(
  container: Container,
  cycleId: string,
  boundaryOrganismId: OrganismId,
  actionSnapshot: ActionSnapshot,
  policyDecisionByOrganismId: ReadonlyMap<OrganismId, ResponsePolicyDecision>,
  runnerUserId: UserId,
  runtimeEnvironment: RuntimeEnvironment,
  options: RegulatorRuntimeOptions,
): Promise<'direct' | 'proposal' | 'declined' | 'failed'> {
  const triggerPolicyOrganismId = actionSnapshot.payload.trigger.responsePolicyOrganismId as OrganismId;
  const decision = policyDecisionByOrganismId.get(triggerPolicyOrganismId);

  if (!decision) {
    await persistRuntimeEvent(container, {
      cycleId,
      stage: 'regulator.action.declined',
      boundaryOrganismId,
      actionOrganismId: actionSnapshot.organismId,
      payload: {
        reason: 'trigger policy not found in boundary',
        triggerPolicyOrganismId,
      },
    });
    return 'declined';
  }

  if (decision.decision !== actionSnapshot.payload.trigger.whenDecision) {
    await persistRuntimeEvent(container, {
      cycleId,
      stage: 'regulator.action.declined',
      boundaryOrganismId,
      actionOrganismId: actionSnapshot.organismId,
      payload: {
        reason: 'trigger decision mismatch',
        expected: actionSnapshot.payload.trigger.whenDecision,
        actual: decision.decision,
      },
    });
    return 'declined';
  }

  if (isCooldownActive(actionSnapshot.payload)) {
    await persistRuntimeEvent(container, {
      cycleId,
      stage: 'regulator.action.declined',
      boundaryOrganismId,
      actionOrganismId: actionSnapshot.organismId,
      payload: {
        reason: 'cooldown active',
        cooldownSeconds: actionSnapshot.payload.cooldownSeconds ?? 300,
      },
    });
    return 'declined';
  }

  const idempotencyKey = computeActionIdempotencyKey(
    boundaryOrganismId,
    actionSnapshot.organismId,
    actionSnapshot.payload,
    decision,
  );

  const reservation = await reserveActionExecution(
    container,
    boundaryOrganismId,
    actionSnapshot.organismId,
    triggerPolicyOrganismId,
    actionSnapshot.payload.executionMode,
    idempotencyKey,
  );

  if (!reservation.reserved) {
    await persistRuntimeEvent(container, {
      cycleId,
      stage: 'regulator.action.declined',
      boundaryOrganismId,
      actionOrganismId: actionSnapshot.organismId,
      executionId: reservation.executionId,
      payload: {
        reason: 'idempotency key already handled',
        idempotencyKey,
      },
    });
    return 'declined';
  }

  await persistRuntimeEvent(container, {
    cycleId,
    stage: 'regulator.action.started',
    boundaryOrganismId,
    actionOrganismId: actionSnapshot.organismId,
    executionId: reservation.executionId,
    payload: {
      idempotencyKey,
      attemptCount: reservation.attemptCount,
      triggerDecision: decision.decision,
    },
  });

  try {
    if (actionRequiresProposal(actionSnapshot.payload)) {
      const proposalId = await openActionExecutionProposal(
        container,
        boundaryOrganismId,
        actionSnapshot,
        decision,
        runnerUserId,
      );

      await appendActionExecutionMetadata(container, actionSnapshot, runnerUserId, idempotencyKey);
      await completeActionExecution(container, reservation.executionId, 'proposal-created', null, {
        proposalId,
        boundaryOrganismId,
        actionOrganismId: actionSnapshot.organismId,
      });
      await persistRuntimeEvent(container, {
        cycleId,
        stage: 'regulator.action.proposal-created',
        boundaryOrganismId,
        actionOrganismId: actionSnapshot.organismId,
        executionId: reservation.executionId,
        payload: {
          proposalId,
          idempotencyKey,
        },
      });
      return 'proposal';
    }

    switch (actionSnapshot.payload.kind) {
      case 'github-pr': {
        const gateway = resolvePullRequestGateway(options);
        const execution = await executeGitHubPrAction(actionSnapshot.payload, runtimeEnvironment, gateway);

        await appendActionExecutionMetadata(container, actionSnapshot, runnerUserId, idempotencyKey);
        await completeActionExecution(container, reservation.executionId, 'succeeded', null, {
          provider: 'github',
          pullRequestNumber: execution.record.number,
          pullRequestUrl: execution.record.url,
          existed: execution.existed,
        });
        await persistRuntimeEvent(container, {
          cycleId,
          stage: 'regulator.action.succeeded',
          boundaryOrganismId,
          actionOrganismId: actionSnapshot.organismId,
          executionId: reservation.executionId,
          payload: {
            idempotencyKey,
            provider: 'github',
            pullRequestNumber: execution.record.number,
            pullRequestUrl: execution.record.url,
            existed: execution.existed,
          },
        });

        return 'direct';
      }
      case 'open-proposal': {
        const execution = await executeOpenProposalAction(
          container,
          actionSnapshot.payload,
          runnerUserId,
          runtimeEnvironment,
        );

        await appendActionExecutionMetadata(container, actionSnapshot, runnerUserId, idempotencyKey);
        await completeActionExecution(container, reservation.executionId, 'succeeded', null, {
          provider: 'internal',
          proposalId: execution.proposalId,
        });
        await persistRuntimeEvent(container, {
          cycleId,
          stage: 'regulator.action.succeeded',
          boundaryOrganismId,
          actionOrganismId: actionSnapshot.organismId,
          executionId: reservation.executionId,
          payload: {
            idempotencyKey,
            provider: 'internal',
            proposalId: execution.proposalId,
          },
        });

        return 'direct';
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await completeActionExecution(container, reservation.executionId, 'failed', message.slice(0, 1000), null);
    await persistRuntimeEvent(container, {
      cycleId,
      stage: 'regulator.action.failed',
      boundaryOrganismId,
      actionOrganismId: actionSnapshot.organismId,
      executionId: reservation.executionId,
      payload: {
        idempotencyKey,
        error: message,
      },
    });

    return 'failed';
  }

  await completeActionExecution(container, reservation.executionId, 'declined', 'Unsupported action kind', {
    actionKind: 'unknown',
  });

  return 'declined';
}

async function runBoundaryCycle(
  container: Container,
  cycleId: string,
  boundaryOrganismId: OrganismId,
  runnerUserId: UserId,
  runtimeEnvironment: RuntimeEnvironment,
  options: RegulatorRuntimeOptions,
): Promise<BoundaryCycleResult> {
  await persistRuntimeEvent(container, {
    cycleId,
    stage: 'regulator.boundary.started',
    boundaryOrganismId,
    payload: {},
  });

  const childStates = await resolveBoundaryChildren(container, boundaryOrganismId);

  const sensorByLabel = new Map<string, SensorSnapshot>();
  const variablesByLabel = new Map<string, ManagedVariableSnapshot>();
  const responsePolicies: ResponsePolicySnapshot[] = [];
  const actions: ActionSnapshot[] = [];

  for (const child of childStates) {
    const state = child.state;
    if (!state) {
      continue;
    }

    if (state.contentTypeId === 'sensor') {
      const sensor = toSensorSnapshot(child.childId, state.payload);
      if (sensor && !sensorByLabel.has(sensor.label)) {
        sensorByLabel.set(sensor.label, sensor);
      }
      continue;
    }

    if (state.contentTypeId === 'variable') {
      const payload = toVariablePayload(state.payload);
      if (payload && !variablesByLabel.has(payload.label)) {
        variablesByLabel.set(payload.label, {
          organismId: child.childId,
          payload,
        });
      }
      continue;
    }

    if (state.contentTypeId === 'response-policy') {
      const payload = toResponsePolicyPayload(state.payload);
      if (payload) {
        responsePolicies.push({ organismId: child.childId, payload });
      }
      continue;
    }

    if (state.contentTypeId === 'action') {
      const payload = toActionPayload(state.payload);
      if (payload) {
        actions.push({ organismId: child.childId, payload });
      }
    }
  }

  let variableUpdates = 0;
  let skippedManagedVariables = 0;
  const variableValueByLabel = new Map<string, number>();

  for (const [label, managedVariable] of variablesByLabel.entries()) {
    const updateResult = await updateManagedVariable(container, managedVariable, sensorByLabel, runnerUserId);
    if (updateResult.updated) {
      variableUpdates += 1;
      await persistRuntimeEvent(container, {
        cycleId,
        stage: 'regulator.variable.updated',
        boundaryOrganismId,
        payload: {
          variableLabel: label,
          variableOrganismId: managedVariable.organismId,
          value: updateResult.value,
        },
      });
    }
    if (updateResult.skipped) {
      skippedManagedVariables += 1;
    }
    variableValueByLabel.set(label, updateResult.value);
  }

  let responsePolicyUpdates = 0;
  const policyDecisionByOrganismId = new Map<OrganismId, ResponsePolicyDecision>();

  for (const policy of responsePolicies) {
    const update = await updateResponsePolicy(container, policy, variableValueByLabel, runnerUserId);
    if (update.updated) {
      responsePolicyUpdates += 1;
      await persistRuntimeEvent(container, {
        cycleId,
        stage: 'regulator.response-policy.updated',
        boundaryOrganismId,
        payload: {
          responsePolicyOrganismId: policy.organismId,
          variableLabel: update.nextPayload.variableLabel,
          currentVariableValue: update.nextPayload.currentVariableValue,
        },
      });
    }

    policyDecisionByOrganismId.set(policy.organismId, evaluateResponsePolicyDecision(update.nextPayload));
  }

  let directActionExecutions = 0;
  let proposalActionsOpened = 0;
  let declinedActions = 0;
  let failedActions = 0;

  for (const action of actions) {
    const outcome = await executeAction(
      container,
      cycleId,
      boundaryOrganismId,
      action,
      policyDecisionByOrganismId,
      runnerUserId,
      runtimeEnvironment,
      options,
    );

    switch (outcome) {
      case 'direct':
        directActionExecutions += 1;
        break;
      case 'proposal':
        proposalActionsOpened += 1;
        break;
      case 'declined':
        declinedActions += 1;
        break;
      case 'failed':
        failedActions += 1;
        break;
    }
  }

  await persistRuntimeEvent(container, {
    cycleId,
    stage: 'regulator.boundary.completed',
    boundaryOrganismId,
    payload: {
      variableUpdates,
      responsePolicyUpdates,
      skippedManagedVariables,
      directActionExecutions,
      proposalActionsOpened,
      declinedActions,
      failedActions,
    },
  });

  return {
    boundaryOrganismId,
    variableUpdates,
    responsePolicyUpdates,
    skippedManagedVariables,
    directActionExecutions,
    proposalActionsOpened,
    declinedActions,
    failedActions,
  };
}

export async function runRegulatorCycle(
  container: Container,
  options: RegulatorRuntimeOptions = {},
): Promise<RegulatorCycleResult> {
  const cycleId = randomUUID();
  const runnerUserId = coerceRunnerUserId(options);
  const boundaryOrganismIds = options.boundaryOrganismIds
    ? normalizeBoundaryList(options.boundaryOrganismIds)
    : await discoverBoundaryOrganisms(container);
  const runtimeEnvironment = runtimeEnvironmentFromEnv();

  await persistRuntimeEvent(container, {
    cycleId,
    stage: 'regulator.cycle.started',
    payload: {
      boundariesPlanned: boundaryOrganismIds.length,
      runnerUserId,
    },
  });

  const boundaries: BoundaryCycleResult[] = [];
  for (const boundaryOrganismId of boundaryOrganismIds) {
    boundaries.push(
      await runBoundaryCycle(container, cycleId, boundaryOrganismId, runnerUserId, runtimeEnvironment, options),
    );
  }

  const result: RegulatorCycleResult = {
    cycleId,
    boundariesProcessed: boundaries.length,
    variableUpdates: boundaries.reduce((total, boundary) => total + boundary.variableUpdates, 0),
    responsePolicyUpdates: boundaries.reduce((total, boundary) => total + boundary.responsePolicyUpdates, 0),
    skippedManagedVariables: boundaries.reduce((total, boundary) => total + boundary.skippedManagedVariables, 0),
    directActionExecutions: boundaries.reduce((total, boundary) => total + boundary.directActionExecutions, 0),
    proposalActionsOpened: boundaries.reduce((total, boundary) => total + boundary.proposalActionsOpened, 0),
    declinedActions: boundaries.reduce((total, boundary) => total + boundary.declinedActions, 0),
    failedActions: boundaries.reduce((total, boundary) => total + boundary.failedActions, 0),
    boundaries,
  };

  await persistRuntimeEvent(container, {
    cycleId,
    stage: 'regulator.cycle.completed',
    payload: {
      boundariesProcessed: result.boundariesProcessed,
      variableUpdates: result.variableUpdates,
      responsePolicyUpdates: result.responsePolicyUpdates,
      skippedManagedVariables: result.skippedManagedVariables,
      directActionExecutions: result.directActionExecutions,
      proposalActionsOpened: result.proposalActionsOpened,
      declinedActions: result.declinedActions,
      failedActions: result.failedActions,
    },
  });

  return result;
}
