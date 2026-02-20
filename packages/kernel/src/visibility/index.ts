export {
  type AccessControlDeps,
  type AccessDecision,
  type ActionType,
  checkAccess,
} from './access-control.js';
export {
  type ChangeVisibilityDeps,
  type ChangeVisibilityInput,
  changeVisibility,
} from './change-visibility.js';
export { checkAccessOrThrow } from './check-access.js';
export type { VisibilityLevel, VisibilityRecord } from './visibility.js';
export type { VisibilityRepository } from './visibility-repository.js';
