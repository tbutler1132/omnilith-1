/**
 * HudProfilePanel — placeholder map profile surface.
 *
 * Starts as intentionally lightweight copy plus current session anchors.
 * This panel will eventually absorb richer regulation-focused profile data.
 */

import { usePlatformStaticState } from '../../../platform/index.js';

export function HudProfilePanel() {
  const { authMode, userId, personalOrganismId, homePageOrganismId } = usePlatformStaticState();

  return (
    <div className="hud-profile-panel">
      <header className="hud-profile-panel-header">
        <h3>Profile</h3>
        <span className="hud-profile-panel-status">{authMode === 'authenticated' ? 'Authenticated' : 'Guest'}</span>
      </header>

      <p className="hud-profile-panel-note">
        Placeholder panel. Regulation and profile tending surfaces will be added here in a later pass.
      </p>

      {authMode === 'authenticated' ? (
        <dl className="hud-profile-panel-facts">
          <div>
            <dt>User</dt>
            <dd>{userId.slice(0, 12)}</dd>
          </div>
          <div>
            <dt>Personal organism</dt>
            <dd>{personalOrganismId ? personalOrganismId.slice(0, 12) : 'Not linked'}</dd>
          </div>
          <div>
            <dt>Home page organism</dt>
            <dd>{homePageOrganismId ? homePageOrganismId.slice(0, 12) : 'Not linked'}</dd>
          </div>
        </dl>
      ) : (
        <p className="hud-profile-panel-note">Log in to see your personal organism links.</p>
      )}
    </div>
  );
}
