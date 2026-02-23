/**
 * Visor widget lane.
 *
 * Hosts small read-only HUD widgets on the right side of the map.
 */

import { Children, type ReactNode } from 'react';

interface VisorWidgetLaneProps {
  readonly children: ReactNode;
}

export function VisorWidgetLane({ children }: VisorWidgetLaneProps) {
  if (Children.count(children) === 0) return null;

  return <aside className="visor-widget-lane">{children}</aside>;
}
