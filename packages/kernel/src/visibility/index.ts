export type { VisibilityLevel, VisibilityRecord } from './visibility.js';
export type { VisibilityRepository } from './visibility-repository.js';
export {
  checkAccess,
  type ActionType,
  type AccessDecision,
  type AccessControlDeps,
} from './access-control.js';
export { checkAccessOrThrow } from './check-access.js';
