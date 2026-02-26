/**
 * Core visor app shell.
 *
 * Shared Phase 1 rendering scaffold for core apps so each app can provide a
 * stable intent surface while implementation details are filled in iteratively.
 */

import type { VisorAppRenderProps } from '../app-contract.js';

interface CoreAppProps {
  readonly appName: string;
  readonly purpose: string;
  readonly primaryFlow: string;
  readonly secondaryFlow: string;
}

export function createCoreAppComponent({ appName, purpose, primaryFlow, secondaryFlow }: CoreAppProps) {
  return function CoreAppModule({ organismId }: VisorAppRenderProps) {
    return (
      <section>
        <h2>{appName}</h2>
        <p>{purpose}</p>
        <p>{primaryFlow}</p>
        <p>{secondaryFlow}</p>
        <p>{organismId ? `Target organism: ${organismId}` : 'Target organism: boundary context'}</p>
      </section>
    );
  };
}
