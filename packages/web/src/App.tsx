import { useCallback, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { AuthGate, type AuthSession } from './auth/AuthGate.js';
import { DocsLayout } from './docs/index.js';
import { Platform } from './platform/index.js';

function AuthenticatedApp() {
  const [session, setSession] = useState<AuthSession | null>(null);

  const handleAuth = useCallback((s: AuthSession) => setSession(s), []);

  function handleLogout() {
    localStorage.removeItem('sessionId');
    setSession(null);
  }

  return (
    <AuthGate onAuth={handleAuth}>
      {session && (
        <Platform
          userId={session.userId}
          personalOrganismId={session.personalOrganismId}
          homePageOrganismId={session.homePageOrganismId}
          onLogout={handleLogout}
        />
      )}
    </AuthGate>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/docs/*" element={<DocsLayout />} />
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </BrowserRouter>
  );
}
