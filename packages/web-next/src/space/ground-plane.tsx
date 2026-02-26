/**
 * Ground plane map grid.
 *
 * Draws a sparse neon-style repeating grid with a luminous map boundary.
 */

import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Altitude } from '../contracts/altitude.js';
import { resolveGridSpacing } from './grid-spacing.js';
import {
  HIGH_ALTITUDE_SECONDARY_SUBDIVISIONS_X,
  HIGH_ALTITUDE_SECONDARY_SUBDIVISIONS_Y,
} from './high-altitude-grid-contract.js';

interface GroundPlaneProps {
  readonly width: number;
  readonly height: number;
  readonly altitude: Altitude;
  readonly recalibrationEpoch: number;
  readonly mapZoomScale?: number;
}

const LINE_OFFSET = 0;
const DARK_GRID_LINE_COLOR = 'rgba(74, 74, 74, 0.72)';
const SECONDARY_GRID_BASE_RGB = '98, 98, 98';
const GRID_GLOW_COLOR = '#ffffff';
const GLOW_BOOT_DELAY_MS = 220;
const GLOW_BOOT_FADE_MS = 1140;
const GLOW_DIP_FADE_MS = 190;

interface AltitudeGlowProfile {
  lineColor: string;
  lineStrokeWidth: number;
  glowStrength: number;
  glowStdDevNear: number;
  glowStdDevFar: number;
  glowOpacityNear: number;
  glowOpacityFar: number;
  glowReacquireFadeMs: number;
  intersectionCornerGap: number;
}

interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface SecondaryGridProfile {
  subdivisionsPerPrimaryX: number;
  subdivisionsPerPrimaryY: number;
  opacity: number;
  strokeWidthScale: number;
}

interface AltitudeBorderProfile {
  baseColor: string;
  accentColor: string;
  glowColor: string;
  baseStrokeWidth: number;
  accentStrokeWidth: number;
  glowStdDevNear: number;
  glowStdDevFar: number;
  glowOpacity: number;
}

const ALTITUDE_GLOW_PROFILES: Readonly<Record<Altitude, AltitudeGlowProfile>> = {
  high: {
    lineColor: 'rgba(172, 172, 172, 0.82)',
    lineStrokeWidth: 2.6,
    glowStrength: 1,
    glowStdDevNear: 4.8,
    glowStdDevFar: 12.8,
    glowOpacityNear: 0.98,
    glowOpacityFar: 0.8,
    glowReacquireFadeMs: 980,
    intersectionCornerGap: 22,
  },
  mid: {
    lineColor: 'rgba(164, 164, 164, 0.75)',
    lineStrokeWidth: 2.05,
    glowStrength: 0.88,
    glowStdDevNear: 2.9,
    glowStdDevFar: 7.2,
    glowOpacityNear: 0.82,
    glowOpacityFar: 0.43,
    glowReacquireFadeMs: 1180,
    intersectionCornerGap: 18,
  },
  close: {
    lineColor: 'rgba(164, 164, 164, 0.72)',
    lineStrokeWidth: 1.85,
    glowStrength: 0.78,
    glowStdDevNear: 2.2,
    glowStdDevFar: 5.8,
    glowOpacityNear: 0.74,
    glowOpacityFar: 0.31,
    glowReacquireFadeMs: 1320,
    intersectionCornerGap: 14,
  },
};

const ALTITUDE_BORDER_PROFILES: Readonly<Record<Altitude, AltitudeBorderProfile>> = {
  high: {
    baseColor: 'rgba(174, 208, 242, 0.34)',
    accentColor: 'rgba(220, 238, 255, 0.78)',
    glowColor: '#9ed2ff',
    baseStrokeWidth: 2.2,
    accentStrokeWidth: 2.9,
    glowStdDevNear: 2.8,
    glowStdDevFar: 8.6,
    glowOpacity: 0.6,
  },
  mid: {
    baseColor: 'rgba(164, 196, 231, 0.29)',
    accentColor: 'rgba(203, 225, 246, 0.64)',
    glowColor: '#8bc3f7',
    baseStrokeWidth: 1.9,
    accentStrokeWidth: 2.4,
    glowStdDevNear: 2.1,
    glowStdDevFar: 6.8,
    glowOpacity: 0.46,
  },
  close: {
    baseColor: 'rgba(156, 186, 222, 0.26)',
    accentColor: 'rgba(191, 216, 240, 0.56)',
    glowColor: '#7ab6ee',
    baseStrokeWidth: 1.7,
    accentStrokeWidth: 2.1,
    glowStdDevNear: 1.8,
    glowStdDevFar: 5.6,
    glowOpacity: 0.39,
  },
};

const ALTITUDE_SECONDARY_GRID_PROFILES: Readonly<Record<Altitude, SecondaryGridProfile>> = {
  high: {
    subdivisionsPerPrimaryX: HIGH_ALTITUDE_SECONDARY_SUBDIVISIONS_X,
    subdivisionsPerPrimaryY: HIGH_ALTITUDE_SECONDARY_SUBDIVISIONS_Y,
    opacity: 0.3,
    strokeWidthScale: 0.62,
  },
  mid: {
    subdivisionsPerPrimaryX: 4,
    subdivisionsPerPrimaryY: 4,
    opacity: 0.14,
    strokeWidthScale: 0.38,
  },
  close: {
    subdivisionsPerPrimaryX: 4,
    subdivisionsPerPrimaryY: 4,
    opacity: 0.18,
    strokeWidthScale: 0.42,
  },
};

const ALTITUDE_ORDER: readonly Altitude[] = ['high', 'mid', 'close'];

function resolveAltitudeGlowProfile(altitude: Altitude): AltitudeGlowProfile {
  return ALTITUDE_GLOW_PROFILES[altitude];
}

function resolveAltitudeBorderProfile(altitude: Altitude): AltitudeBorderProfile {
  return ALTITUDE_BORDER_PROFILES[altitude];
}

function createIntersectionJunctionPath(x: number, y: number, gapHalf: number, curveInset: number): string {
  const topY = y - gapHalf;
  const rightX = x + gapHalf;
  const bottomY = y + gapHalf;
  const leftX = x - gapHalf;

  return [
    `M ${x} ${topY}`,
    `Q ${x + curveInset} ${y - curveInset} ${rightX} ${y}`,
    `Q ${x + curveInset} ${y + curveInset} ${x} ${bottomY}`,
    `Q ${x - curveInset} ${y + curveInset} ${leftX} ${y}`,
    `Q ${x - curveInset} ${y - curveInset} ${x} ${topY}`,
    'Z',
  ].join(' ');
}

function createSegmentsPath(segments: ReadonlyArray<LineSegment>): string {
  return segments.map((segment) => `M ${segment.x1} ${segment.y1} L ${segment.x2} ${segment.y2}`).join(' ');
}

function createFullVerticalPath(verticalLines: ReadonlyArray<number>, originY: number, fullGridHeight: number): string {
  return verticalLines.map((x) => `M ${x} ${originY} L ${x} ${originY + fullGridHeight}`).join(' ');
}

function createFullHorizontalPath(
  horizontalLines: ReadonlyArray<number>,
  originX: number,
  fullGridWidth: number,
): string {
  return horizontalLines.map((y) => `M ${originX} ${y} L ${originX + fullGridWidth} ${y}`).join(' ');
}

function createBorderCornerPath(
  borderX: number,
  borderY: number,
  borderWidth: number,
  borderHeight: number,
  cornerLength: number,
): string {
  if (borderWidth <= 0 || borderHeight <= 0) {
    return '';
  }

  const maxX = borderX + borderWidth;
  const maxY = borderY + borderHeight;
  const resolvedCornerLengthX = Math.min(cornerLength, borderWidth / 2);
  const resolvedCornerLengthY = Math.min(cornerLength, borderHeight / 2);

  return [
    `M ${borderX} ${borderY + resolvedCornerLengthY} L ${borderX} ${borderY} L ${borderX + resolvedCornerLengthX} ${borderY}`,
    `M ${maxX - resolvedCornerLengthX} ${borderY} L ${maxX} ${borderY} L ${maxX} ${borderY + resolvedCornerLengthY}`,
    `M ${maxX} ${maxY - resolvedCornerLengthY} L ${maxX} ${maxY} L ${maxX - resolvedCornerLengthX} ${maxY}`,
    `M ${borderX + resolvedCornerLengthX} ${maxY} L ${borderX} ${maxY} L ${borderX} ${maxY - resolvedCornerLengthY}`,
  ].join(' ');
}

export const GroundPlane = memo(function GroundPlane({
  width,
  height,
  altitude,
  recalibrationEpoch,
  mapZoomScale = 1,
}: GroundPlaneProps) {
  const svgId = useId().replace(/:/g, '');
  const glowFilterPrefix = `ground-grid-glow-${svgId}`;
  const glowProfile = useMemo(() => resolveAltitudeGlowProfile(altitude), [altitude]);
  const borderProfile = useMemo(() => resolveAltitudeBorderProfile(altitude), [altitude]);
  const secondaryGridProfile = useMemo(() => ALTITUDE_SECONDARY_GRID_PROFILES[altitude], [altitude]);
  const secondaryGridLineColor = useMemo(
    () => `rgba(${SECONDARY_GRID_BASE_RGB}, ${secondaryGridProfile.opacity})`,
    [secondaryGridProfile.opacity],
  );
  const normalizedMapZoomScale = useMemo(() => {
    if (!Number.isFinite(mapZoomScale) || mapZoomScale <= 0) {
      return 1;
    }

    return mapZoomScale;
  }, [mapZoomScale]);
  const worldUnitsPerScreenPixel = useMemo(() => 1 / normalizedMapZoomScale, [normalizedMapZoomScale]);
  const scaledLineStrokeWidth = useMemo(
    () => Math.max(0.35, glowProfile.lineStrokeWidth * worldUnitsPerScreenPixel),
    [glowProfile.lineStrokeWidth, worldUnitsPerScreenPixel],
  );
  const scaledSecondaryLineStrokeWidth = useMemo(
    () => Math.max(0.16, scaledLineStrokeWidth * secondaryGridProfile.strokeWidthScale),
    [scaledLineStrokeWidth, secondaryGridProfile.strokeWidthScale],
  );
  const scaledBorderStrokeWidth = useMemo(
    () => Math.max(0.42, borderProfile.baseStrokeWidth * worldUnitsPerScreenPixel),
    [borderProfile.baseStrokeWidth, worldUnitsPerScreenPixel],
  );
  const scaledBorderAccentStrokeWidth = useMemo(
    () => Math.max(0.6, borderProfile.accentStrokeWidth * worldUnitsPerScreenPixel),
    [borderProfile.accentStrokeWidth, worldUnitsPerScreenPixel],
  );
  const scaledIntersectionCornerGap = useMemo(
    () => Math.max(2, glowProfile.intersectionCornerGap * worldUnitsPerScreenPixel),
    [glowProfile.intersectionCornerGap, worldUnitsPerScreenPixel],
  );
  const glowFilterId = `${glowFilterPrefix}-${altitude}`;
  const borderGlowFilterId = `ground-grid-border-glow-${svgId}-${altitude}`;
  const glowStrengthRef = useRef(glowProfile.glowStrength);
  glowStrengthRef.current = glowProfile.glowStrength;
  const [glowOpacity, setGlowOpacity] = useState(0);
  const [glowTransitionMs, setGlowTransitionMs] = useState(GLOW_BOOT_FADE_MS);
  const bootTimerRef = useRef<number | null>(null);
  const bootCompleteRef = useRef(false);
  const previousRecalibrationEpochRef = useRef(recalibrationEpoch);
  const gridSpacing = useMemo(() => resolveGridSpacing(width, height), [height, width]);
  const {
    fullGridWidth,
    fullGridHeight,
    originX,
    originY,
    verticalLines,
    horizontalLines,
    secondaryVerticalLines,
    secondaryHorizontalLines,
  } = useMemo(() => {
    const subdivisionsPerPrimaryX = secondaryGridProfile.subdivisionsPerPrimaryX;
    const subdivisionsPerPrimaryY = secondaryGridProfile.subdivisionsPerPrimaryY;
    const columnCount = Math.floor(width / gridSpacing);
    const rowCount = Math.floor(height / gridSpacing);
    const resolvedFullGridWidth = columnCount * gridSpacing;
    const resolvedFullGridHeight = rowCount * gridSpacing;
    const resolvedOriginX = (width - resolvedFullGridWidth) / 2;
    const resolvedOriginY = (height - resolvedFullGridHeight) / 2;
    const resolvedVerticalLines = Array.from({ length: Math.max(0, columnCount - 1) }, (_, index) => {
      return resolvedOriginX + (index + 1) * gridSpacing + LINE_OFFSET;
    });
    const resolvedHorizontalLines = Array.from({ length: Math.max(0, rowCount - 1) }, (_, index) => {
      return resolvedOriginY + (index + 1) * gridSpacing + LINE_OFFSET;
    });
    const resolvedSecondaryVerticalLines = Array.from(
      { length: Math.max(0, columnCount * subdivisionsPerPrimaryX - 1) },
      (_, index) => index + 1,
    )
      .filter((step) => step % subdivisionsPerPrimaryX !== 0)
      .map((step) => resolvedOriginX + (step * gridSpacing) / subdivisionsPerPrimaryX + LINE_OFFSET);
    const resolvedSecondaryHorizontalLines = Array.from(
      { length: Math.max(0, rowCount * subdivisionsPerPrimaryY - 1) },
      (_, index) => index + 1,
    )
      .filter((step) => step % subdivisionsPerPrimaryY !== 0)
      .map((step) => resolvedOriginY + (step * gridSpacing) / subdivisionsPerPrimaryY + LINE_OFFSET);

    return {
      fullGridWidth: resolvedFullGridWidth,
      fullGridHeight: resolvedFullGridHeight,
      originX: resolvedOriginX,
      originY: resolvedOriginY,
      verticalLines: resolvedVerticalLines,
      horizontalLines: resolvedHorizontalLines,
      secondaryVerticalLines: resolvedSecondaryVerticalLines,
      secondaryHorizontalLines: resolvedSecondaryHorizontalLines,
    };
  }, [
    gridSpacing,
    height,
    secondaryGridProfile.subdivisionsPerPrimaryX,
    secondaryGridProfile.subdivisionsPerPrimaryY,
    width,
  ]);
  const borderX = originX;
  const borderY = originY;
  const borderWidth = fullGridWidth;
  const borderHeight = fullGridHeight;
  const borderCornerLength = useMemo(() => {
    const minDimension = Math.max(1, Math.min(borderWidth, borderHeight));
    const minimumLength = 56 * worldUnitsPerScreenPixel;
    const preferredLength = gridSpacing * 0.42;
    const maximumLength = minDimension * 0.16;
    return Math.max(minimumLength, Math.min(preferredLength, maximumLength));
  }, [borderHeight, borderWidth, gridSpacing, worldUnitsPerScreenPixel]);
  const borderCornerPath = useMemo(
    () => createBorderCornerPath(borderX, borderY, borderWidth, borderHeight, borderCornerLength),
    [borderCornerLength, borderHeight, borderWidth, borderX, borderY],
  );
  const normalizedBorderGlowStdDevNear = useMemo(
    () => Math.max(0.001, borderProfile.glowStdDevNear * worldUnitsPerScreenPixel),
    [borderProfile.glowStdDevNear, worldUnitsPerScreenPixel],
  );
  const normalizedBorderGlowStdDevFar = useMemo(
    () => Math.max(0.001, borderProfile.glowStdDevFar * worldUnitsPerScreenPixel),
    [borderProfile.glowStdDevFar, worldUnitsPerScreenPixel],
  );
  const borderGlowFilterMargin = useMemo(
    () => Math.ceil(normalizedBorderGlowStdDevFar * 9 + scaledBorderAccentStrokeWidth * 6),
    [normalizedBorderGlowStdDevFar, scaledBorderAccentStrokeWidth],
  );
  const { horizontalSegments, verticalSegments } = useMemo(() => {
    const gapHalf = scaledIntersectionCornerGap / 2;
    const mapMaxX = originX + fullGridWidth;
    const mapMaxY = originY + fullGridHeight;
    const resolvedHorizontalSegments: Array<LineSegment> = [];
    const resolvedVerticalSegments: Array<LineSegment> = [];

    horizontalLines.forEach((y) => {
      let segmentStart = originX;
      verticalLines.forEach((x) => {
        const segmentEnd = x - gapHalf;
        if (segmentEnd > segmentStart) {
          resolvedHorizontalSegments.push({
            x1: segmentStart,
            y1: y,
            x2: segmentEnd,
            y2: y,
          });
        }
        segmentStart = x + gapHalf;
      });

      if (mapMaxX > segmentStart) {
        resolvedHorizontalSegments.push({
          x1: segmentStart,
          y1: y,
          x2: mapMaxX,
          y2: y,
        });
      }
    });

    verticalLines.forEach((x) => {
      let segmentStart = originY;
      horizontalLines.forEach((y) => {
        const segmentEnd = y - gapHalf;
        if (segmentEnd > segmentStart) {
          resolvedVerticalSegments.push({
            x1: x,
            y1: segmentStart,
            x2: x,
            y2: segmentEnd,
          });
        }
        segmentStart = y + gapHalf;
      });

      if (mapMaxY > segmentStart) {
        resolvedVerticalSegments.push({
          x1: x,
          y1: segmentStart,
          x2: x,
          y2: mapMaxY,
        });
      }
    });

    return {
      horizontalSegments: resolvedHorizontalSegments,
      verticalSegments: resolvedVerticalSegments,
    };
  }, [fullGridHeight, fullGridWidth, horizontalLines, originX, originY, scaledIntersectionCornerGap, verticalLines]);
  const intersectionJunctionPath = useMemo(() => {
    const gapHalf = scaledIntersectionCornerGap / 2;
    const curveInset = gapHalf * 0.12;

    return verticalLines
      .flatMap((x) => {
        return horizontalLines.map((y) => {
          return createIntersectionJunctionPath(x, y, gapHalf, curveInset);
        });
      })
      .join(' ');
  }, [horizontalLines, scaledIntersectionCornerGap, verticalLines]);
  const baseVerticalPath = useMemo(
    () => createFullVerticalPath(verticalLines, originY, fullGridHeight),
    [fullGridHeight, originY, verticalLines],
  );
  const baseHorizontalPath = useMemo(
    () => createFullHorizontalPath(horizontalLines, originX, fullGridWidth),
    [fullGridWidth, horizontalLines, originX],
  );
  const secondaryVerticalPath = useMemo(
    () => createFullVerticalPath(secondaryVerticalLines, originY, fullGridHeight),
    [fullGridHeight, originY, secondaryVerticalLines],
  );
  const secondaryHorizontalPath = useMemo(
    () => createFullHorizontalPath(secondaryHorizontalLines, originX, fullGridWidth),
    [fullGridWidth, originX, secondaryHorizontalLines],
  );
  const glowVerticalPath = useMemo(() => createSegmentsPath(verticalSegments), [verticalSegments]);
  const glowHorizontalPath = useMemo(() => createSegmentsPath(horizontalSegments), [horizontalSegments]);

  useEffect(() => {
    if (bootTimerRef.current !== null) {
      window.clearTimeout(bootTimerRef.current);
      bootTimerRef.current = null;
    }

    setGlowTransitionMs(GLOW_BOOT_FADE_MS);
    setGlowOpacity(0);
    bootCompleteRef.current = false;
    bootTimerRef.current = window.setTimeout(() => {
      setGlowOpacity(glowStrengthRef.current);
      bootCompleteRef.current = true;
      bootTimerRef.current = null;
    }, GLOW_BOOT_DELAY_MS);
  }, []);

  useEffect(() => {
    if (!bootCompleteRef.current) {
      return;
    }

    setGlowTransitionMs(glowProfile.glowReacquireFadeMs);
    setGlowOpacity(glowProfile.glowStrength);
  }, [glowProfile.glowReacquireFadeMs, glowProfile.glowStrength]);

  useEffect(() => {
    if (recalibrationEpoch === previousRecalibrationEpochRef.current) {
      return;
    }

    previousRecalibrationEpochRef.current = recalibrationEpoch;

    if (!bootCompleteRef.current) {
      return;
    }

    // Keep glow stable during recalibration to avoid perceived flicker.
    setGlowTransitionMs(GLOW_DIP_FADE_MS);
    setGlowOpacity(glowStrengthRef.current);
  }, [recalibrationEpoch]);

  useEffect(() => {
    return () => {
      if (bootTimerRef.current !== null) {
        window.clearTimeout(bootTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className="ground-plane"
      style={{
        width,
        height,
        transform: 'translateZ(0)',
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        shapeRendering="geometricPrecision"
        aria-hidden
      >
        <title>Ground plane grid</title>
        <defs>
          {ALTITUDE_ORDER.map((level) => {
            const profile = ALTITUDE_GLOW_PROFILES[level];
            const normalizedStdDevNear = Math.max(0.001, profile.glowStdDevNear * worldUnitsPerScreenPixel);
            const normalizedStdDevFar = Math.max(0.001, profile.glowStdDevFar * worldUnitsPerScreenPixel);
            const glowFilterMargin = Math.ceil(normalizedStdDevFar * 10 + profile.lineStrokeWidth * 6);
            return (
              <filter
                key={`${glowFilterPrefix}-${level}`}
                id={`${glowFilterPrefix}-${level}`}
                filterUnits="userSpaceOnUse"
                x={originX - glowFilterMargin}
                y={originY - glowFilterMargin}
                width={fullGridWidth + glowFilterMargin * 2}
                height={fullGridHeight + glowFilterMargin * 2}
                colorInterpolationFilters="sRGB"
              >
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation={normalizedStdDevNear}
                  floodColor={GRID_GLOW_COLOR}
                  floodOpacity={profile.glowOpacityNear}
                />
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation={normalizedStdDevFar}
                  floodColor={GRID_GLOW_COLOR}
                  floodOpacity={profile.glowOpacityFar}
                />
              </filter>
            );
          })}
          <filter
            id={borderGlowFilterId}
            filterUnits="userSpaceOnUse"
            x={borderX - borderGlowFilterMargin}
            y={borderY - borderGlowFilterMargin}
            width={borderWidth + borderGlowFilterMargin * 2}
            height={borderHeight + borderGlowFilterMargin * 2}
            colorInterpolationFilters="sRGB"
          >
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation={normalizedBorderGlowStdDevNear}
              floodColor={borderProfile.glowColor}
              floodOpacity={borderProfile.glowOpacity * 0.72}
            />
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation={normalizedBorderGlowStdDevFar}
              floodColor={borderProfile.glowColor}
              floodOpacity={borderProfile.glowOpacity * 0.4}
            />
          </filter>
        </defs>
        <g>
          <path
            d={secondaryVerticalPath}
            stroke={secondaryGridLineColor}
            strokeWidth={scaledSecondaryLineStrokeWidth}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            fill="none"
          />
          <path
            d={secondaryHorizontalPath}
            stroke={secondaryGridLineColor}
            strokeWidth={scaledSecondaryLineStrokeWidth}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            fill="none"
          />
          <path
            d={baseVerticalPath}
            stroke={DARK_GRID_LINE_COLOR}
            strokeWidth={scaledLineStrokeWidth}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            fill="none"
          />
          <path
            d={baseHorizontalPath}
            stroke={DARK_GRID_LINE_COLOR}
            strokeWidth={scaledLineStrokeWidth}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            fill="none"
          />
          <rect
            x={borderX}
            y={borderY}
            width={borderWidth}
            height={borderHeight}
            stroke={borderProfile.baseColor}
            strokeWidth={scaledBorderStrokeWidth}
            vectorEffect="non-scaling-stroke"
            fill="none"
            rx={scaledBorderStrokeWidth * 0.66}
            ry={scaledBorderStrokeWidth * 0.66}
          />
        </g>
        <g filter={`url(#${borderGlowFilterId})`}>
          <rect
            x={borderX}
            y={borderY}
            width={borderWidth}
            height={borderHeight}
            stroke={borderProfile.glowColor}
            strokeOpacity={borderProfile.glowOpacity}
            strokeWidth={scaledBorderStrokeWidth * 0.84}
            vectorEffect="non-scaling-stroke"
            fill="none"
            rx={scaledBorderStrokeWidth * 0.66}
            ry={scaledBorderStrokeWidth * 0.66}
          />
          <path
            d={borderCornerPath}
            stroke={borderProfile.accentColor}
            strokeWidth={scaledBorderAccentStrokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            fill="none"
          />
        </g>
        <g
          filter={`url(#${glowFilterId})`}
          style={{
            opacity: glowOpacity,
            transition: `opacity ${glowTransitionMs}ms cubic-bezier(0.3, 0.6, 0.22, 1)`,
          }}
        >
          <path
            d={glowVerticalPath}
            stroke={glowProfile.lineColor}
            strokeWidth={scaledLineStrokeWidth}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            fill="none"
          />
          <path
            d={glowHorizontalPath}
            stroke={glowProfile.lineColor}
            strokeWidth={scaledLineStrokeWidth}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            fill="none"
          />
          <path
            d={intersectionJunctionPath}
            fill={glowProfile.lineColor}
            stroke={glowProfile.lineColor}
            strokeWidth={scaledLineStrokeWidth * 0.7}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
    </div>
  );
});
