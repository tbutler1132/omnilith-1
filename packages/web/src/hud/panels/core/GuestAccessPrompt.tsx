/**
 * GuestAccessPrompt — unified guest gating surface for write-only panels.
 *
 * Strategy is runtime-configurable: either collect interest emails or
 * nudge guests into authentication.
 */

import type { InterestSourcePanel } from '../../../api/interest.js';
import { requestAuthDialog } from '../../../auth/auth-request.js';
import { runtimeFlags } from '../../../config/runtime-flags.js';
import { RegisterInterestForm } from './RegisterInterestForm.js';

interface GuestAccessPromptProps {
  sourcePanel: InterestSourcePanel;
  title?: string;
  interestMessage?: string;
  loginMessage?: string;
  loginLabel?: string;
}

export function GuestAccessPrompt({
  sourcePanel,
  title = 'Continue',
  interestMessage,
  loginMessage = 'Log in to continue from this panel.',
  loginLabel = 'Log in',
}: GuestAccessPromptProps) {
  if (runtimeFlags.guestAccessStrategy === 'interest') {
    return <RegisterInterestForm sourcePanel={sourcePanel} title={title} message={interestMessage} />;
  }

  return (
    <div className="guest-access-login">
      <span className="hud-info-label">{title}</span>
      <p className="guest-access-login-message">{loginMessage}</p>
      <button
        type="button"
        className="hud-action-btn"
        onClick={() => {
          requestAuthDialog();
        }}
      >
        {loginLabel}
      </button>
    </div>
  );
}
