/**
 * VisorWidgetLane — shared lane for adaptive visor widgets.
 *
 * Widgets are not panels. They are lightweight situational indicators
 * rendered in a dedicated lane that can be gated by context and intent.
 */

import { Children, type ReactNode } from 'react';

interface VisorWidgetLaneProps {
  children: ReactNode;
}

export function VisorWidgetLane({ children }: VisorWidgetLaneProps) {
  if (Children.count(children) === 0) return null;

  return <div className="visor-widget-lane">{children}</div>;
}
