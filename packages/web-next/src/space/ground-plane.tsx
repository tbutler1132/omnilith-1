/**
 * Ground plane map grid.
 *
 * Draws a sparse neon-style repeating grid with no outer border lines.
 */

import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Altitude } from '../contracts/altitude.js';

interface GroundPlaneProps {
  readonly width: number;
  readonly height: number;
  readonly altitude: Altitude;
  readonly recalibrationEpoch: number;
}

const GRID_SPACING = 700;
const LINE_OFFSET = 0.5;
const DARK_GRID_LINE_COLOR = 'rgba(74, 74, 74, 0.72)';
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

const ALTITUDE_ORDER: readonly Altitude[] = ['high', 'mid', 'close'];

function resolveAltitudeGlowProfile(altitude: Altitude): AltitudeGlowProfile {
  return ALTITUDE_GLOW_PROFILES[altitude];
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

export const GroundPlane = memo(function GroundPlane({
  width,
  height,
  altitude,
  recalibrationEpoch,
}: GroundPlaneProps) {
  const svgId = useId().replace(/:/g, '');
  const glowFilterPrefix = `ground-grid-glow-${svgId}`;
  const glowProfile = useMemo(() => resolveAltitudeGlowProfile(altitude), [altitude]);
  const glowFilterId = `${glowFilterPrefix}-${altitude}`;
  const glowStrengthRef = useRef(glowProfile.glowStrength);
  glowStrengthRef.current = glowProfile.glowStrength;
  const [glowOpacity, setGlowOpacity] = useState(0);
  const [glowTransitionMs, setGlowTransitionMs] = useState(GLOW_BOOT_FADE_MS);
  const bootTimerRef = useRef<number | null>(null);
  const bootCompleteRef = useRef(false);
  const previousRecalibrationEpochRef = useRef(recalibrationEpoch);
  const { fullGridWidth, fullGridHeight, originX, originY, verticalLines, horizontalLines } = useMemo(() => {
    const columnCount = Math.floor(width / GRID_SPACING);
    const rowCount = Math.floor(height / GRID_SPACING);
    const resolvedFullGridWidth = columnCount * GRID_SPACING;
    const resolvedFullGridHeight = rowCount * GRID_SPACING;
    const resolvedOriginX = (width - resolvedFullGridWidth) / 2;
    const resolvedOriginY = (height - resolvedFullGridHeight) / 2;
    const resolvedVerticalLines = Array.from({ length: Math.max(0, columnCount - 1) }, (_, index) => {
      return resolvedOriginX + (index + 1) * GRID_SPACING + LINE_OFFSET;
    });
    const resolvedHorizontalLines = Array.from({ length: Math.max(0, rowCount - 1) }, (_, index) => {
      return resolvedOriginY + (index + 1) * GRID_SPACING + LINE_OFFSET;
    });

    return {
      fullGridWidth: resolvedFullGridWidth,
      fullGridHeight: resolvedFullGridHeight,
      originX: resolvedOriginX,
      originY: resolvedOriginY,
      verticalLines: resolvedVerticalLines,
      horizontalLines: resolvedHorizontalLines,
    };
  }, [width, height]);
  const { horizontalSegments, verticalSegments } = useMemo(() => {
    const gapHalf = glowProfile.intersectionCornerGap / 2;
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
  }, [
    fullGridHeight,
    fullGridWidth,
    glowProfile.intersectionCornerGap,
    horizontalLines,
    originX,
    originY,
    verticalLines,
  ]);
  const intersectionJunctionPath = useMemo(() => {
    const gapHalf = glowProfile.intersectionCornerGap / 2;
    const curveInset = gapHalf * 0.12;

    return verticalLines
      .flatMap((x) => {
        return horizontalLines.map((y) => {
          return createIntersectionJunctionPath(x, y, gapHalf, curveInset);
        });
      })
      .join(' ');
  }, [glowProfile.intersectionCornerGap, horizontalLines, verticalLines]);
  const baseVerticalPath = useMemo(
    () => createFullVerticalPath(verticalLines, originY, fullGridHeight),
    [fullGridHeight, originY, verticalLines],
  );
  const baseHorizontalPath = useMemo(
    () => createFullHorizontalPath(horizontalLines, originX, fullGridWidth),
    [fullGridWidth, horizontalLines, originX],
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

    setGlowTransitionMs(GLOW_DIP_FADE_MS);
    setGlowOpacity(Math.max(0.015, glowStrengthRef.current * 0.06));
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
      }}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
        <title>Ground plane grid</title>
        <defs>
          {ALTITUDE_ORDER.map((level) => {
            const profile = ALTITUDE_GLOW_PROFILES[level];
            return (
              <filter
                key={`${glowFilterPrefix}-${level}`}
                id={`${glowFilterPrefix}-${level}`}
                x="-24%"
                y="-24%"
                width="148%"
                height="148%"
                colorInterpolationFilters="sRGB"
              >
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation={profile.glowStdDevNear}
                  floodColor="#ffffff"
                  floodOpacity={profile.glowOpacityNear}
                />
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation={profile.glowStdDevFar}
                  floodColor="#ffffff"
                  floodOpacity={profile.glowOpacityFar}
                />
              </filter>
            );
          })}
        </defs>
        <g>
          <path
            d={baseVerticalPath}
            stroke={DARK_GRID_LINE_COLOR}
            strokeWidth={glowProfile.lineStrokeWidth}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={baseHorizontalPath}
            stroke={DARK_GRID_LINE_COLOR}
            strokeWidth={glowProfile.lineStrokeWidth}
            strokeLinecap="round"
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
            strokeWidth={glowProfile.lineStrokeWidth}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={glowHorizontalPath}
            stroke={glowProfile.lineColor}
            strokeWidth={glowProfile.lineStrokeWidth}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={intersectionJunctionPath}
            fill={glowProfile.lineColor}
            stroke={glowProfile.lineColor}
            strokeWidth={glowProfile.lineStrokeWidth * 0.7}
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
});
