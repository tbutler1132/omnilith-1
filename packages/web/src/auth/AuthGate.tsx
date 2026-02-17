/**
 * AuthGate — handles signup and login before showing the app.
 *
 * Checks localStorage for an existing session. If none, shows a
 * simple auth form. On success, stores the sessionId and renders children.
 */

import { useEffect, useState } from 'react';
import { fetchSession, login, signup } from '../api/auth.js';
import type { AuthSession } from './session.js';

interface AuthGateProps {
  children: React.ReactNode;
  onAuth: (session: AuthSession) => void;
}

export function AuthGate({ children, onAuth }: AuthGateProps) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      setChecking(false);
      return;
    }

    fetchSession()
      .then((session) => {
        onAuth({
          userId: session.userId,
          personalOrganismId: session.personalOrganismId,
          homePageOrganismId: session.homePageOrganismId,
        });
        setAuthenticated(true);
      })
      .catch(() => {
        localStorage.removeItem('sessionId');
      })
      .finally(() => setChecking(false));
  }, [onAuth]);

  if (checking) {
    return (
      <div className="auth-page">
        <p className="loading">Loading...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <AuthForm
        onSuccess={(session) => {
          onAuth(session);
          setAuthenticated(true);
        }}
      />
    );
  }

  return <>{children}</>;
}

function AuthForm({ onSuccess }: { onSuccess: (session: AuthSession) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const fn = mode === 'signup' ? signup : login;
      await fn(email, password);
      const session = await fetchSession();
      onSuccess({
        userId: session.userId,
        personalOrganismId: session.personalOrganismId,
        homePageOrganismId: session.homePageOrganismId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Omnilith</h1>
        <p>{mode === 'signup' ? 'Create your account to begin.' : 'Welcome back.'}</p>

        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={3}
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? '...' : mode === 'signup' ? 'Create account' : 'Log in'}
          </button>
        </form>

        <p className="switch">
          {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
          <button type="button" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
            {mode === 'signup' ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
