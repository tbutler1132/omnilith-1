/**
 * Renderer registry — maps content type IDs to React components.
 *
 * The rendering layer asks "what content type is this state?" and
 * loads the appropriate renderer. Unknown types get a fallback.
 */

import type { ComponentType } from 'react';
import type { OrganismState } from '../api/organisms.js';

export interface RendererProps {
  state: OrganismState;
}

const renderers = new Map<string, ComponentType<RendererProps>>();

export function registerRenderer(typeId: string, component: ComponentType<RendererProps>) {
  renderers.set(typeId, component);
}

export function getRenderer(typeId: string): ComponentType<RendererProps> | undefined {
  return renderers.get(typeId);
}
