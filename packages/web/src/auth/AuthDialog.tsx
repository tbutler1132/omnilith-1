/**
 * AuthDialog — non-blocking login/signup overlay.
 *
 * Allows guests to authenticate without leaving the current platform view.
 */

import { type FormEvent, useState } from 'react';
import { fetchSession, login, signup } from '../api/auth.js';
import type { AuthSession } from './session.js';

interface AuthDialogProps {
  onAuthenticated: (session: AuthSession) => void;
  onClose: () => void;
}

export function AuthDialog({ onAuthenticated, onClose }: AuthDialogProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const fn = mode === 'signup' ? signup : login;
      await fn(email, password);
      const session = await fetchSession();
      onAuthenticated({
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
    <div className="auth-page" role="dialog" aria-modal="true" aria-label="Authentication">
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

        <p className="switch">
          <button type="button" onClick={onClose}>
            Continue exploring
          </button>
        </p>
      </div>
    </div>
  );
}
