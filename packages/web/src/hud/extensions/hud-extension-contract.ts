/**
 * HUD extension contract — installable rendering add-ons for visor/HUD behavior.
 *
 * This defines a stable manifest shape for future installable HUD apps while
 * keeping all writes routed through existing API capability checks.
 */

export type HudExtensionSlot = 'map-panel' | 'visor-panel' | 'visor-widget' | 'hud-cue';

export type HudExtensionCapability =
  | 'read-organism'
  | 'append-state'
  | 'open-proposal'
  | 'integrate-proposal'
  | 'decline-proposal'
  | 'compose'
  | 'decompose';

export interface HudExtensionManifest {
  readonly id: string;
  readonly version: string;
  readonly hostApiVersion: string;
  readonly slots: ReadonlyArray<HudExtensionSlot>;
  readonly capabilities: ReadonlyArray<HudExtensionCapability>;
}

export interface HudExtensionRuntime {
  readonly manifest: HudExtensionManifest;
}
