/**
 * Platform — bootstrap component for the Space + Visor paradigm.
 *
 * Fetches the world map ID, then wraps Space and Visor in PlatformProvider.
 * This is the root of the authenticated experience.
 */

import { useEffect, useState } from 'react';
import { fetchWorldMap } from '../api/organisms.js';
import { Space } from '../space/index.js';
import { Visor } from '../visor/index.js';
import { PlatformProvider } from './PlatformContext.js';

interface PlatformProps {
  userId: string;
  personalOrganismId: string | null;
  homePageOrganismId: string | null;
  onLogout: () => void;
}

export function Platform({ userId, personalOrganismId, homePageOrganismId, onLogout }: PlatformProps) {
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
          <button type="button" onClick={onLogout}>
            Log out
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
      userId={userId}
      personalOrganismId={personalOrganismId}
      homePageOrganismId={homePageOrganismId}
      worldMapId={worldMapId}
    >
      <div className="platform">
        <Space />
        <Visor onLogout={onLogout} />
      </div>
    </PlatformProvider>
  );
}
