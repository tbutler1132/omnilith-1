/**
 * Visor app contract.
 *
 * Defines the boundary each visor app implements so apps remain isolated
 * modules that can be mounted by the open visor shell.
 */

import type { ComponentType } from 'react';

export interface VisorAppRenderProps {
  readonly onRequestClose: () => void;
  readonly organismId: string | null;
  readonly personalOrganismId?: string | null;
}

export interface VisorAppDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly component: ComponentType<VisorAppRenderProps>;
}
