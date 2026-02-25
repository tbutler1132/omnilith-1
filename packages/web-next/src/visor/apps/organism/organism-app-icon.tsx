/**
 * Organism app icon.
 *
 * Small composition glyph used as the official launcher icon for the organism app.
 */

import type { SVGProps } from 'react';

export function OrganismAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <title>Organism app</title>
      <path d="M5.35 4h5.3" />
      <path d="M5.35 5.1 7.25 10.35" />
      <path d="M10.65 5.1 8.75 10.35" />
      <circle cx="4" cy="4" r="1.8" />
      <circle cx="12" cy="4" r="1.8" />
      <circle cx="8" cy="12" r="2" />
    </svg>
  );
}
