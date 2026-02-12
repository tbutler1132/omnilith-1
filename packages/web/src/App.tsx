import { useCallback, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { AuthGate } from './auth/AuthGate.js';
import { Landing } from './Landing.js';
import { OrganismView } from './organisms/OrganismView.js';

export function App() {
  const [userId, setUserId] = useState<string | null>(null);

  const handleAuth = useCallback((id: string) => setUserId(id), []);

  function handleLogout() {
    localStorage.removeItem('sessionId');
    setUserId(null);
  }

  return (
    <AuthGate onAuth={handleAuth}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing userId={userId ?? ''} onLogout={handleLogout} />} />
          <Route path="/organisms/:id" element={<OrganismView />} />
        </Routes>
      </BrowserRouter>
    </AuthGate>
  );
}
