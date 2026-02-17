/**
 * AuthSession — authenticated user context returned by /auth/me.
 */

export interface AuthSession {
  userId: string;
  personalOrganismId: string | null;
  homePageOrganismId: string | null;
}
