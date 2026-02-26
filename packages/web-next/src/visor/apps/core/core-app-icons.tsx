/**
 * Core visor app icons.
 *
 * Experimental glyph set for first-party core apps.
 *
 * Icons are intentionally asymmetrical and slightly surreal while preserving
 * legibility at very small dock sizes.
 */

import type { SVGProps } from 'react';

function CoreIconFrame({ title, children, ...props }: SVGProps<SVGSVGElement> & { readonly title: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

export function OrganismViewAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <CoreIconFrame {...props} title="Organism View app">
      <circle cx="8" cy="8" r="5.2" opacity="0.85" />
      <path d="M3.8 8h8.4M8 3.8v8.4M5 5.2l6 5.6" />
      <circle cx="8" cy="8" r="1.35" fill="currentColor" stroke="none" />
    </CoreIconFrame>
  );
}

export function ProposalWorkbenchAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <CoreIconFrame {...props} title="Proposal Workbench app">
      <path d="M3.2 11.9 12.7 3.7" />
      <path d="M4.1 4.6h4.1M7.8 11.5h4.1" opacity="0.7" />
      <circle cx="4.1" cy="11.9" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12.7" cy="3.7" r="1.15" fill="currentColor" stroke="none" />
    </CoreIconFrame>
  );
}

export function IntegrationQueueAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <CoreIconFrame {...props} title="Integration Queue app">
      <path d="M3.8 8.2 6.4 10.7 12.2 4.9" />
      <path d="M3.1 12.3h9.8" opacity="0.7" />
      <circle cx="3.1" cy="12.3" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="12.9" cy="12.3" r="0.8" fill="currentColor" stroke="none" />
    </CoreIconFrame>
  );
}

export function SystemsViewAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <CoreIconFrame {...props} title="Systems View app">
      <circle cx="4.2" cy="4.3" r="1.2" />
      <circle cx="11.8" cy="4.3" r="1.2" />
      <circle cx="8" cy="11.7" r="1.2" />
      <path d="M5.3 4.8 7.1 10.7M10.7 4.8 8.9 10.7M5.2 4.3h5.6" />
    </CoreIconFrame>
  );
}

export function MapStudioAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <CoreIconFrame {...props} title="Map Studio app">
      <path d="M3.1 12.4V4l3 1.5 3.2-1.5 3 1.5v8.4l-3-1.5-3.2 1.5z" />
      <path d="M6.1 5.5v8.4M9.3 4v8.4" opacity="0.72" />
      <circle cx="9.3" cy="8.2" r="1.05" fill="currentColor" stroke="none" />
    </CoreIconFrame>
  );
}

export function VitalityEventStreamAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <CoreIconFrame {...props} title="Vitality and Event Stream app">
      <path d="M2.8 9.7h2.4l1.6-3.5 1.7 4.8 1.5-2.2h3.2" />
      <path d="M2.8 6.1h10.4" opacity="0.22" />
      <circle cx="12.2" cy="9.7" r="1" fill="currentColor" stroke="none" />
    </CoreIconFrame>
  );
}

export function QueryExplorerAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <CoreIconFrame {...props} title="Query Explorer app">
      <circle cx="6.8" cy="6.8" r="2.6" />
      <path d="M8.7 8.7 12.4 12.4" />
      <path d="M4.1 3.7 3 2.6M9.7 3.7l1.1-1.1M4.1 9.9 3 11" opacity="0.72" />
    </CoreIconFrame>
  );
}
