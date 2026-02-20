/**
 * App — top-level rendering shell.
 *
 * Resolves auth/session state and routes into the platform rendering
 * flow, including the adaptive visor harness mode.
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchSession } from './api/auth.js';
import { AuthDialog } from './auth/AuthDialog.js';
import { subscribeToAuthDialogRequests } from './auth/auth-request.js';
import type { AuthSession } from './auth/session.js';
import { runtimeFlags } from './config/runtime-flags.js';
import { clearOrganismCache } from './hooks/use-organism.js';
import { AdaptiveVisorHarness } from './hud/panels/core/AdaptiveVisorHarness.js';
import { Platform } from './platform/index.js';

function AppShell() {
  const [checkingSession, setCheckingSession] = useState(runtimeFlags.authEnabled);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  useEffect(() => {
    if (!runtimeFlags.authEnabled) {
      localStorage.removeItem('sessionId');
      clearOrganismCache();
      setSession(null);
      setCheckingSession(false);
      return;
    }

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

  useEffect(() => {
    if (!runtimeFlags.authEnabled) return;
    return subscribeToAuthDialogRequests(() => {
      if (session) return;
      setShowAuthDialog(true);
    });
  }, [session]);

  useEffect(() => {
    if (!runtimeFlags.authEnabled || session) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === '1') {
      setShowAuthDialog(true);
    }
  }, [session]);

  useEffect(() => {
    if (!runtimeFlags.authEnabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (session) return;
      const isModifierPressed = event.metaKey || event.ctrlKey;
      if (!isModifierPressed || !event.shiftKey) return;
      if (event.key.toLowerCase() !== 'l') return;
      event.preventDefault();
      setShowAuthDialog(true);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [session]);

  const handleAuthenticated = useCallback((next: AuthSession) => {
    clearOrganismCache();
    setSession(next);
    setShowAuthDialog(false);
  }, []);

  const handleCloseAuthDialog = useCallback(() => {
    setShowAuthDialog(false);
  }, []);

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
      />
      {runtimeFlags.authEnabled && showAuthDialog && !session ? (
        <AuthDialog onAuthenticated={handleAuthenticated} onClose={handleCloseAuthDialog} />
      ) : null}
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
