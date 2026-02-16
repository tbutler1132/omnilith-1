/**
 * Platform — bootstrap component for the Space + HUD paradigm.
 *
 * Fetches the world map ID, then wraps Space and Hud in PlatformProvider.
 * This is the root of both guest read and authenticated tending flows.
 */

import { useEffect, useState } from 'react';
import { fetchWorldMap } from '../api/organisms.js';
import { Hud } from '../hud/index.js';
import { Space, SpaceNavBar } from '../space/index.js';
import type { AuthMode } from './PlatformContext.js';
import { PlatformProvider, usePlatformVisorState } from './PlatformContext.js';

/** Syncs visorOrganismId to the URL so organism links are shareable */
function UrlSync() {
  const { visorOrganismId } = usePlatformVisorState();

  useEffect(() => {
    const url = new URL(window.location.href);
    if (visorOrganismId) {
      url.searchParams.set('organism', visorOrganismId);
    } else {
      url.searchParams.delete('organism');
    }
    window.history.replaceState(null, '', url);
  }, [visorOrganismId]);

  return null;
}

interface PlatformProps {
  authMode: AuthMode;
  userId: string;
  personalOrganismId: string | null;
  homePageOrganismId: string | null;
  onLogoutOrLogin: () => void;
}

export function Platform({ authMode, userId, personalOrganismId, homePageOrganismId, onLogoutOrLogin }: PlatformProps) {
  const [worldMapId, setWorldMapId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorldMap()
      .then((res) => setWorldMapId(res.worldMapId))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load world map'));
  }, []);

  if (error) {
    return (
      <div className="platform">
        <div className="platform-error">
          <p>{error}</p>
          <button type="button" onClick={onLogoutOrLogin}>
            {authMode === 'authenticated' ? 'Log out' : 'Log in'}
          </button>
        </div>
      </div>
    );
  }

  if (!worldMapId) {
    return (
      <div className="platform">
        <div className="platform-loading">Loading platform...</div>
      </div>
    );
  }

  return (
    <PlatformProvider
      authMode={authMode}
      userId={userId}
      personalOrganismId={personalOrganismId}
      homePageOrganismId={homePageOrganismId}
      worldMapId={worldMapId}
    >
      <div className="platform">
        <Space />
        <SpaceNavBar />
        <Hud onLogoutOrLogin={onLogoutOrLogin} />
        <UrlSync />
      </div>
    </PlatformProvider>
  );
}
