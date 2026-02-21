/**
 * GitHub issue gateway — minimal REST client for issue create/search.
 *
 * Keeps external API concerns at the adapter boundary so kernel logic
 * remains deterministic and dependency-free.
 */

import type { ProposalId } from '@omnilith/kernel';
import { buildProposalMarker } from './proposal-marker.js';

export interface GitHubIssueRecord {
  readonly number: number;
  readonly url: string;
  readonly title: string;
  readonly body: string;
  readonly state: 'open' | 'closed';
  readonly labels: ReadonlyArray<string>;
}

export interface CreateGitHubIssueInput {
  readonly owner: string;
  readonly repository: string;
  readonly title: string;
  readonly body: string;
}

export interface FindIssueByProposalMarkerInput {
  readonly owner: string;
  readonly repository: string;
  readonly proposalId: ProposalId;
}

export interface GitHubIssueGateway {
  createIssue(input: CreateGitHubIssueInput): Promise<GitHubIssueRecord>;
  findIssueByProposalMarker(input: FindIssueByProposalMarkerInput): Promise<GitHubIssueRecord | undefined>;
}

interface GitHubIssueResponse {
  readonly number: number;
  readonly html_url: string;
  readonly title: string;
  readonly body: string | null;
  readonly state: 'open' | 'closed';
  readonly labels?: ReadonlyArray<{ readonly name?: string | null }>;
}

interface GitHubIssueSearchResponse {
  readonly items?: ReadonlyArray<GitHubIssueResponse>;
}

function toIssueRecord(issue: GitHubIssueResponse): GitHubIssueRecord {
  return {
    number: issue.number,
    url: issue.html_url,
    title: issue.title,
    body: issue.body ?? '',
    state: issue.state,
    labels: (issue.labels ?? [])
      .map((label) => label.name ?? '')
      .map((label) => label.trim())
      .filter((label) => label.length > 0),
  };
}

async function parseJsonOrText(response: Response): Promise<string> {
  const text = await response.text();
  if (text.length === 0) {
    return '';
  }

  try {
    const parsed = JSON.parse(text) as { message?: unknown };
    if (typeof parsed.message === 'string') {
      return parsed.message;
    }
  } catch {
    // Fall through to raw text.
  }

  return text;
}

export class GitHubRestIssueGateway implements GitHubIssueGateway {
  constructor(
    private readonly token: string,
    private readonly apiBaseUrl: string = 'https://api.github.com',
  ) {}

  async createIssue(input: CreateGitHubIssueInput): Promise<GitHubIssueRecord> {
    const response = await fetch(`${this.apiBaseUrl}/repos/${input.owner}/${input.repository}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ title: input.title, body: input.body }),
    });

    if (!response.ok) {
      const details = await parseJsonOrText(response);
      throw new Error(`GitHub issue create failed (${response.status}): ${details}`);
    }

    const body = (await response.json()) as GitHubIssueResponse;
    return toIssueRecord(body);
  }

  async findIssueByProposalMarker(input: FindIssueByProposalMarkerInput): Promise<GitHubIssueRecord | undefined> {
    const marker = buildProposalMarker(input.proposalId);
    const query = `repo:${input.owner}/${input.repository} in:body type:issue "${marker}"`;
    const url = `${this.apiBaseUrl}/search/issues?q=${encodeURIComponent(query)}&per_page=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      const details = await parseJsonOrText(response);
      throw new Error(`GitHub issue search failed (${response.status}): ${details}`);
    }

    const body = (await response.json()) as GitHubIssueSearchResponse;
    const first = body.items?.[0];
    return first ? toIssueRecord(first) : undefined;
  }
}
