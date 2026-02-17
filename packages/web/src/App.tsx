import { useCallback, useEffect, useState } from 'react';
import { fetchSession } from './api/auth.js';
import { AuthDialog } from './auth/AuthDialog.js';
import type { AuthSession } from './auth/session.js';
import { clearOrganismCache } from './hooks/use-organism.js';
import { AdaptiveVisorHarness } from './hud/panels/core/AdaptiveVisorHarness.js';
import { Platform } from './platform/index.js';

function AppShell() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  useEffect(() => {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      setCheckingSession(false);
      return;
    }

    fetchSession()
      .then((res) => {
        setSession({
          userId: res.userId,
          personalOrganismId: res.personalOrganismId,
          homePageOrganismId: res.homePageOrganismId,
        });
      })
      .catch(() => {
        localStorage.removeItem('sessionId');
        clearOrganismCache();
        setSession(null);
      })
      .finally(() => {
        setCheckingSession(false);
      });
  }, []);

  const handleAuthenticated = useCallback((next: AuthSession) => {
    clearOrganismCache();
    setSession(next);
    setShowAuthDialog(false);
  }, []);

  const handleLogoutOrLogin = useCallback(() => {
    if (session) {
      localStorage.removeItem('sessionId');
      clearOrganismCache();
      setSession(null);
      return;
    }
    setShowAuthDialog(true);
  }, [session]);

  function handleCloseAuthDialog() {
    setShowAuthDialog(false);
  }

  if (checkingSession) {
    return (
      <div className="auth-page">
        <p className="loading">Loading...</p>
      </div>
    );
  }

  const authMode = session ? 'authenticated' : 'guest';
  const userId = session?.userId ?? 'guest';
  const personalOrganismId = session?.personalOrganismId ?? null;
  const homePageOrganismId = session?.homePageOrganismId ?? null;

  return (
    <>
      <Platform
        authMode={authMode}
        userId={userId}
        personalOrganismId={personalOrganismId}
        homePageOrganismId={homePageOrganismId}
        onLogoutOrLogin={handleLogoutOrLogin}
      />
      {showAuthDialog && !session && (
        <AuthDialog onAuthenticated={handleAuthenticated} onClose={handleCloseAuthDialog} />
      )}
    </>
  );
}

function AuthenticatedApp() {
  // Retained for compatibility with existing imports/tests that may render App.
  // The runtime flow now supports guest mode as default.
  return <AppShell />;
}

export function App() {
  const harnessMode = new URLSearchParams(window.location.search).get('adaptiveVisorHarness');
  if (harnessMode === '1' || harnessMode === 'true') {
    return <AdaptiveVisorHarness />;
  }
  return <AuthenticatedApp />;
}
