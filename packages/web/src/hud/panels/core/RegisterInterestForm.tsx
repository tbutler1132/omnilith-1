/**
 * RegisterInterestForm — reusable guest CTA for gated demo interactions.
 *
 * Captures an email so visitors can register interest without creating
 * an account during the V1 demo phase.
 */

import { useState } from 'react';
import { type InterestSourcePanel, registerInterest } from '../../../api/interest.js';

interface RegisterInterestFormProps {
  sourcePanel: InterestSourcePanel;
  title?: string;
  message?: string;
}

export function RegisterInterestForm({
  sourcePanel,
  title = 'Register Interest',
  message = 'Leave your email and we will share access as soon as this surface opens.',
}: RegisterInterestFormProps) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    setError(null);
    try {
      await registerInterest(email.trim(), sourcePanel);
      setSent(true);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit interest');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="register-interest">
        <span className="hud-info-label">{title}</span>
        <p className="register-interest-success">Thanks. You are on the list.</p>
      </div>
    );
  }

  return (
    <form className="register-interest" onSubmit={handleSubmit}>
      <span className="hud-info-label">{title}</span>
      <p className="register-interest-message">{message}</p>
      <label className="register-interest-label" htmlFor={`register-interest-${sourcePanel}`}>
        Email
      </label>
      <input
        id={`register-interest-${sourcePanel}`}
        className="register-interest-input"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        required
      />
      <button type="submit" className="hud-action-btn register-interest-submit" disabled={sending}>
        {sending ? 'Submitting...' : 'Register interest'}
      </button>
      {error ? <p className="register-interest-error">{error}</p> : null}
    </form>
  );
}
