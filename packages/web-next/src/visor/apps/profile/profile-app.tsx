/**
 * Profile app placeholder.
 *
 * First isolated visor app module used to validate open visor layout and
 * app-level composition before real profile functionality is introduced.
 */

import type { VisorAppRenderProps } from '../app-contract.js';

export function ProfileApp({ onRequestClose }: VisorAppRenderProps) {
  void onRequestClose;

  return (
    <section className="profile-app">
      <h2 className="profile-app-title">Profile</h2>

      <div className="profile-app-body">
        <p>This is the first isolated Visor app placeholder.</p>
        <p>Future profile content will live entirely inside this app module.</p>
      </div>
    </section>
  );
}
