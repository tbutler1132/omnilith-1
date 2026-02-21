/**
 * GitHub integration plugin.
 *
 * Provides one installable module boundary for GitHub-specific behavior:
 * route registration, proposal-integration trigger wiring, and runtime
 * operator docs (env + worker command).
 */

import type { CompositionRepository, StateRepository } from '@omnilith/kernel';
import type { Hono } from 'hono';
import type { Container } from '../container.js';
import type { Database } from '../db/connection.js';
import { parseGitHubAllowlist } from './allowlist.js';
import { githubIntegrationRoutes } from './github-integration-routes.js';
import { GitHubProposalIntegrationTrigger } from './github-proposal-integration-trigger.js';
import { NoopProposalIntegrationTrigger, type ProposalIntegrationTrigger } from './proposal-integration-trigger.js';

const GITHUB_ROUTE_BASE_PATH = '/integrations/github';
const GITHUB_DISPATCH_WORKER_COMMAND = 'pnpm github:dispatch-issues';
const REGULATOR_WORKER_COMMAND = 'pnpm regulator:run';

export interface GitHubPluginDeps {
  readonly db: Database;
  readonly compositionRepository: CompositionRepository;
  readonly stateRepository: StateRepository;
}

export interface GitHubPluginRuntime {
  readonly enabled: boolean;
  readonly routeBasePath: string;
  readonly dispatchWorkerCommand: string;
  readonly regulatorWorkerCommand: string;
  readonly allowlistedRepositories: ReadonlyArray<string>;
  readonly requiredEnvWhenEnabled: ReadonlyArray<string>;
  readonly optionalEnv: ReadonlyArray<string>;
}

export interface GitHubPlugin {
  readonly proposalIntegrationTrigger: ProposalIntegrationTrigger;
  readonly runtime: GitHubPluginRuntime;
  registerRoutes(app: Hono, container: Container): void;
  describeRuntime(): ReadonlyArray<string>;
}

function isEnabledFromEnv(): boolean {
  return process.env.GITHUB_ISSUE_AUTOMATION_ENABLED === 'true';
}

function buildRuntime(): GitHubPluginRuntime {
  const allowlist = parseGitHubAllowlist(process.env.GITHUB_ALLOWED_REPOS);
  return {
    enabled: isEnabledFromEnv(),
    routeBasePath: GITHUB_ROUTE_BASE_PATH,
    dispatchWorkerCommand: GITHUB_DISPATCH_WORKER_COMMAND,
    regulatorWorkerCommand: REGULATOR_WORKER_COMMAND,
    allowlistedRepositories: [...allowlist].sort(),
    requiredEnvWhenEnabled: ['GITHUB_ISSUE_AUTOMATION_ENABLED', 'GITHUB_ALLOWED_REPOS', 'GITHUB_TOKEN'],
    optionalEnv: [
      'GITHUB_WEBHOOK_SECRET',
      'GITHUB_ISSUE_SENSOR_ORGANISM_ID',
      'REGULATOR_BOUNDARY_ORGANISM_IDS',
      'REGULATOR_RUNNER_USER_ID',
      'REGULATOR_ALLOWED_BASE_BRANCHES',
      'REGULATOR_ALLOWED_TARGET_ORGANISM_IDS',
      'GITHUB_ISSUE_DISPATCH_BATCH_SIZE',
      'GITHUB_ISSUE_DISPATCH_MAX_ATTEMPTS',
      'GITHUB_API_BASE_URL',
    ],
  };
}

function buildProposalIntegrationTrigger(
  deps: GitHubPluginDeps,
  runtime: GitHubPluginRuntime,
): ProposalIntegrationTrigger {
  if (!runtime.enabled) {
    return new NoopProposalIntegrationTrigger();
  }

  return new GitHubProposalIntegrationTrigger({
    db: deps.db,
    compositionRepository: deps.compositionRepository,
    stateRepository: deps.stateRepository,
  });
}

export function createGitHubPlugin(deps: GitHubPluginDeps): GitHubPlugin {
  const runtime = buildRuntime();

  return {
    proposalIntegrationTrigger: buildProposalIntegrationTrigger(deps, runtime),
    runtime,
    registerRoutes(app, container) {
      app.route(runtime.routeBasePath, githubIntegrationRoutes(container));
    },
    describeRuntime() {
      const lines = [
        `[github-plugin] enabled: ${runtime.enabled ? 'yes' : 'no'}`,
        `[github-plugin] route: ${runtime.routeBasePath}`,
        `[github-plugin] dispatch worker: ${runtime.dispatchWorkerCommand}`,
        `[github-plugin] regulator worker: ${runtime.regulatorWorkerCommand}`,
        `[github-plugin] allowlist entries: ${runtime.allowlistedRepositories.length}`,
      ];

      if (runtime.allowlistedRepositories.length > 0) {
        lines.push(`[github-plugin] allowlist: ${runtime.allowlistedRepositories.join(', ')}`);
      }

      lines.push(`[github-plugin] required env (when enabled): ${runtime.requiredEnvWhenEnabled.join(', ')}`);
      lines.push(`[github-plugin] optional env: ${runtime.optionalEnv.join(', ')}`);
      return lines;
    },
  };
}

export function createNoopGitHubPlugin(): GitHubPlugin {
  const runtime: GitHubPluginRuntime = {
    enabled: false,
    routeBasePath: GITHUB_ROUTE_BASE_PATH,
    dispatchWorkerCommand: GITHUB_DISPATCH_WORKER_COMMAND,
    regulatorWorkerCommand: REGULATOR_WORKER_COMMAND,
    allowlistedRepositories: [],
    requiredEnvWhenEnabled: ['GITHUB_ISSUE_AUTOMATION_ENABLED', 'GITHUB_ALLOWED_REPOS', 'GITHUB_TOKEN'],
    optionalEnv: [
      'GITHUB_WEBHOOK_SECRET',
      'GITHUB_ISSUE_SENSOR_ORGANISM_ID',
      'REGULATOR_BOUNDARY_ORGANISM_IDS',
      'REGULATOR_RUNNER_USER_ID',
      'REGULATOR_ALLOWED_BASE_BRANCHES',
      'REGULATOR_ALLOWED_TARGET_ORGANISM_IDS',
      'GITHUB_ISSUE_DISPATCH_BATCH_SIZE',
      'GITHUB_ISSUE_DISPATCH_MAX_ATTEMPTS',
      'GITHUB_API_BASE_URL',
    ],
  };

  return {
    proposalIntegrationTrigger: new NoopProposalIntegrationTrigger(),
    runtime,
    registerRoutes(_app, _container) {
      // No-op plugin registration for tests and isolated adapters.
    },
    describeRuntime() {
      return [
        '[github-plugin] enabled: no',
        `[github-plugin] route: ${runtime.routeBasePath}`,
        `[github-plugin] dispatch worker: ${runtime.dispatchWorkerCommand}`,
        `[github-plugin] regulator worker: ${runtime.regulatorWorkerCommand}`,
      ];
    },
  };
}
