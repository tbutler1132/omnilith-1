/**
 * GitHub issue contract — registers the issue twin content type.
 */

import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateGitHubIssue } from './validator.js';

export const githubIssueContentType: ContentTypeContract = {
  typeId: 'github-issue' as ContentTypeId,
  validate: validateGitHubIssue,
};
