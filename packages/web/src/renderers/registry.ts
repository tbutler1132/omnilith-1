/**
 * Renderer registry — maps content type IDs to React components.
 *
 * The rendering layer asks "what content type is this state?" and
 * loads the appropriate renderer. Unknown types get a fallback.
 */

import type { ComponentType } from 'react';
import type { OrganismState } from '../api/types.js';

export interface RendererProps {
  state: OrganismState;
  zoom: number;
  focused: boolean;
  previewMode?: 'thermal' | 'true-renderer';
}

const renderers = new Map<string, ComponentType<RendererProps>>();

export function registerRenderer(typeId: string, component: ComponentType<RendererProps>) {
  renderers.set(typeId, component);
}

export function getRenderer(typeId: string): ComponentType<RendererProps> | undefined {
  return renderers.get(typeId);
}
