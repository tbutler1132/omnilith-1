/**
 * Profile app icon.
 *
 * Small identity glyph used as the official launcher icon for the profile app.
 */

import type { SVGProps } from 'react';

export function ProfileAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <title>Profile app</title>
      <circle cx="8" cy="5.1" r="2.2" />
      <path d="M3.4 12.3C4.55 10.2 6.16 9.15 8 9.15s3.45 1.05 4.6 3.15" />
    </svg>
  );
}
