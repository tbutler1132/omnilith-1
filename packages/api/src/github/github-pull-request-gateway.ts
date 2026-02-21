/**
 * GitHub pull request gateway — minimal REST client for PR create/search.
 *
 * Keeps external API details at the adapter boundary so the regulator
 * runtime can remain deterministic and content-type-driven.
 */

export interface GitHubPullRequestRecord {
  readonly number: number;
  readonly url: string;
  readonly title: string;
  readonly state: 'open' | 'closed';
  readonly headBranch: string;
  readonly baseBranch: string;
}

export interface CreateGitHubPullRequestInput {
  readonly owner: string;
  readonly repository: string;
  readonly title: string;
  readonly body: string;
  readonly headBranch: string;
  readonly baseBranch: string;
  readonly draft?: boolean;
}

export interface FindOpenPullRequestByHeadInput {
  readonly owner: string;
  readonly repository: string;
  readonly headBranch: string;
  readonly baseBranch?: string;
}

export interface GitHubPullRequestGateway {
  createPullRequest(input: CreateGitHubPullRequestInput): Promise<GitHubPullRequestRecord>;
  findOpenPullRequestByHead(input: FindOpenPullRequestByHeadInput): Promise<GitHubPullRequestRecord | undefined>;
}

interface GitHubPullRequestResponse {
  readonly number: number;
  readonly html_url: string;
  readonly title: string;
  readonly state: 'open' | 'closed';
  readonly head: { readonly ref: string };
  readonly base: { readonly ref: string };
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

function toPullRequestRecord(payload: GitHubPullRequestResponse): GitHubPullRequestRecord {
  return {
    number: payload.number,
    url: payload.html_url,
    title: payload.title,
    state: payload.state,
    headBranch: payload.head.ref,
    baseBranch: payload.base.ref,
  };
}

export class GitHubRestPullRequestGateway implements GitHubPullRequestGateway {
  constructor(
    private readonly token: string,
    private readonly apiBaseUrl: string = 'https://api.github.com',
  ) {}

  async createPullRequest(input: CreateGitHubPullRequestInput): Promise<GitHubPullRequestRecord> {
    const response = await fetch(`${this.apiBaseUrl}/repos/${input.owner}/${input.repository}/pulls`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        title: input.title,
        body: input.body,
        head: input.headBranch,
        base: input.baseBranch,
        draft: input.draft ?? false,
      }),
    });

    if (!response.ok) {
      const details = await parseJsonOrText(response);
      throw new Error(`GitHub pull request create failed (${response.status}): ${details}`);
    }

    const body = (await response.json()) as GitHubPullRequestResponse;
    return toPullRequestRecord(body);
  }

  async findOpenPullRequestByHead(input: FindOpenPullRequestByHeadInput): Promise<GitHubPullRequestRecord | undefined> {
    const params = new URLSearchParams({
      state: 'open',
      head: `${input.owner}:${input.headBranch}`,
      per_page: '1',
    });

    if (input.baseBranch) {
      params.set('base', input.baseBranch);
    }

    const response = await fetch(
      `${this.apiBaseUrl}/repos/${input.owner}/${input.repository}/pulls?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );

    if (!response.ok) {
      const details = await parseJsonOrText(response);
      throw new Error(`GitHub pull request lookup failed (${response.status}): ${details}`);
    }

    const body = (await response.json()) as ReadonlyArray<GitHubPullRequestResponse>;
    const first = body[0];
    return first ? toPullRequestRecord(first) : undefined;
  }
}
