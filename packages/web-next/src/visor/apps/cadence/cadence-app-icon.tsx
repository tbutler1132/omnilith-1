/**
 * Boundary cadence app icon.
 *
 * Small rhythmic meter glyph used as the official launcher icon for cadence.
 */

import type { SVGProps } from 'react';

export function CadenceAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <title>Cadence app</title>
      <path d="M2.5 12.4h11" />
      <path d="M4 12.4V8.1" />
      <path d="M6.8 12.4V5.4" />
      <path d="M9.6 12.4V3.3" />
      <path d="M12.4 12.4V6.6" />
    </svg>
  );
}
