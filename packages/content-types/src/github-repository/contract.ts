/**
 * GitHub repository contract — registers the repository twin content type.
 */

import type { ContentTypeContract, ContentTypeId } from '@omnilith/kernel';
import { validateGitHubRepository } from './validator.js';

export const githubRepositoryContentType: ContentTypeContract = {
  typeId: 'github-repository' as ContentTypeId,
  validate: validateGitHubRepository,
};
