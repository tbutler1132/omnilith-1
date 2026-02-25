/**
 * Visor app contract.
 *
 * Defines the boundary each visor app implements so apps remain isolated
 * modules that can be mounted by the open visor shell.
 */

import type { ComponentType, SVGProps } from 'react';
import type { SpatialContextChangedListener, VisorAppSpatialContext } from './spatial-context-contract.js';

export interface VisorAppOpenRequest {
  readonly appId: string;
  readonly organismId?: string | null;
  readonly appRouteState?: unknown;
}

export interface VisorAppRouteCodec<TRouteState = unknown> {
  parseRoute(searchParams: URLSearchParams): TRouteState;
  writeRoute(searchParams: URLSearchParams, routeState: TRouteState): URLSearchParams;
  clearRoute?(searchParams: URLSearchParams): URLSearchParams;
}

export interface VisorAppLoadingRenderProps {
  readonly appLabel: string;
}

type BivariantRouteStateHandler<TRouteState> = {
  bivarianceHack(nextState: TRouteState): void;
}['bivarianceHack'];

export interface VisorAppRenderProps<TRouteState = unknown> {
  readonly onRequestClose: () => void;
  readonly organismId: string | null;
  readonly personalOrganismId?: string | null;
  readonly spatialContext: VisorAppSpatialContext;
  readonly onSpatialContextChanged: (listener: SpatialContextChangedListener) => () => void;
  readonly appRouteState?: TRouteState;
  readonly onChangeAppRouteState?: BivariantRouteStateHandler<TRouteState>;
  readonly onOpenApp?: (request: VisorAppOpenRequest) => void;
}

export interface VisorAppDefinition<TRouteState = unknown> {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly icon: ComponentType<SVGProps<SVGSVGElement>>;
  readonly component: ComponentType<VisorAppRenderProps<TRouteState>>;
  readonly routeCodec?: VisorAppRouteCodec<TRouteState>;
  readonly loadingComponent?: ComponentType<VisorAppLoadingRenderProps>;
  readonly bootDurationMs?: number;
}
