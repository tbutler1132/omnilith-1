/**
 * GitHub allowlist helpers.
 *
 * External automation is constrained to explicit owner/repository pairs.
 * This module centralizes normalization and membership checks.
 */

export interface GitHubRepositoryRef {
  readonly owner: string;
  readonly name: string;
}

function normalizeSegment(value: string): string {
  return value.trim().toLowerCase();
}

export function toRepositoryKey(owner: string, name: string): string {
  return `${normalizeSegment(owner)}/${normalizeSegment(name)}`;
}

export function parseGitHubAllowlist(rawValue: string | undefined): ReadonlySet<string> {
  if (!rawValue) {
    return new Set();
  }

  const entries = rawValue
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const [owner, name] = entry.split('/');
      if (!owner || !name) {
        return null;
      }
      return toRepositoryKey(owner, name);
    })
    .filter((entry): entry is string => entry !== null);

  return new Set(entries);
}

export function isRepositoryAllowed(allowlist: ReadonlySet<string>, repository: GitHubRepositoryRef): boolean {
  if (allowlist.size === 0) {
    return false;
  }

  return allowlist.has(toRepositoryKey(repository.owner, repository.name));
}
