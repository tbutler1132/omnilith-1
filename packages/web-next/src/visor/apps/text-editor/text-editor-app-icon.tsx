/**
 * Text editor app icon.
 *
 * Small glyph used as the launcher icon for text tending in the open visor.
 */

import type { SVGProps } from 'react';

export function TextEditorAppIcon(props: SVGProps<SVGSVGElement>) {
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
      <title>Text editor app</title>
      <path d="M3.2 3.2h9.6" />
      <path d="M3.2 6h7.8" />
      <path d="M3.2 8.8h9.6" />
      <path d="M3.2 11.6h6.4" />
    </svg>
  );
}
