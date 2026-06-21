/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VoiceprintData, VoiceprintTrack, RenderConfig, DisplayMode } from "../types";
import { applyAmplitudeContrast } from "./contrast";
import { computeTrackRadiusSlots } from "./radiusMapping";
import { resolveTrackRenderSeries } from "./trackSelection";

export interface Point2D {
  x: number;
  y: number;
}

export interface TrackLinePoints {
  harmonicOrder: number;
  leftPoints: Point2D[];
  rightPoints: Point2D[];
}

function measureDistance(point: Point2D, cx: number, cy: number): number {
  return Math.hypot(point.x - cx, point.y - cy);
}

function inferGuideRadius(
  trackLines: TrackLinePoints[],
  cx: number,
  cy: number,
  fallbackRadius?: number,
): number | undefined {
  const maxPointRadius = trackLines.reduce((maxRadius, line) => {
    for (const point of line.leftPoints) {
      maxRadius = Math.max(maxRadius, measureDistance(point, cx, cy));
    }
    for (const point of line.rightPoints) {
      maxRadius = Math.max(maxRadius, measureDistance(point, cx, cy));
    }
    return maxRadius;
  }, 0);

  const safeFallback =
    typeof fallbackRadius === "number" && Number.isFinite(fallbackRadius) && fallbackRadius > 0
      ? fallbackRadius
      : 0;
  const resolved = Math.max(safeFallback, maxPointRadius);

  return resolved > 0 ? resolved : undefined;
}

/**
 * Computes cumulative continuous phase arrays from the F0 frequency time series.
 * Integrating frequency over dt guarantees flicker-free and robust wave shapes.
 */
export function computeCumulativePhase(data: VoiceprintData): Float32Array {
  const M = data.sampleCount;
  const cumulative = new Float32Array(M);
  cumulative[0] = 0;
  
  for (let j = 1; j < M; j++) {
    const dt = data.time[j] - data.time[j - 1];
    const avgF0 = (data.f0[j] + data.f0[j - 1]) / 2;
    // Integration: phi(t) = phi(t-1) + 2 * PI * F0 * dt
    cumulative[j] = cumulative[j - 1] + 2 * Math.PI * avgF0 * dt;
  }
  return cumulative;
}

/**
 * Precalculates matching 2D coordinate points for both channels.
 */
export function calculateTrackPoints(
  data: VoiceprintData,
  deformedTracks: VoiceprintTrack[],
  config: RenderConfig,
  cumulativePhase: Float32Array,
  cx: number,
  cy: number
): TrackLinePoints[] {
  const {
    displayMode,
    leftTrackIndices,
    rightTrackIndices,
    leftRenderMode,
    rightRenderMode,
    radiusMode,
    frequencyMin,
    frequencyMax,
    radiusMin,
    radiusMax,
    energyInfluence,
    amplitudeContrast = 2,
    amplitudeScale,
    leftScale = 1,
    rightScale = 1,
    waveDensityMultiplier
  } = config;

  const M = data.sampleCount;
  const leftSlots = computeTrackRadiusSlots({
    tracks: data.tracks,
    f0: data.f0,
    radiusMode,
    frequencyMin,
    frequencyMax,
    radiusMin,
    radiusMax,
    energyInfluence,
  });
  const rightSlots = computeTrackRadiusSlots({
    tracks: deformedTracks,
    f0: data.f0,
    radiusMode,
    frequencyMin,
    frequencyMax,
    radiusMin,
    radiusMax,
    energyInfluence,
  });
  const leftSeries = resolveTrackRenderSeries(data.tracks, leftTrackIndices, leftRenderMode, leftSlots);
  const rightSeries = resolveTrackRenderSeries(
    deformedTracks,
    rightTrackIndices,
    rightRenderMode,
    rightSlots,
  );
  const maxActiveTracks = Math.max(leftSeries.length, rightSeries.length);
  const result: TrackLinePoints[] = [];

  for (let k = 0; k < maxActiveTracks; k++) {
    const leftSeriesItem = leftSeries[k];
    const rightSeriesItem = rightSeries[k];
    const leftActive = Boolean(leftSeriesItem);
    const rightActive = Boolean(rightSeriesItem);

    if (!leftActive && !rightActive) continue;

    const leftRadius = leftSeriesItem?.radius ?? radiusMin;
    const rightRadius = rightSeriesItem?.radius ?? radiusMin;

    const leftPoints: Point2D[] = [];
    const rightPoints: Point2D[] = [];
    const leftAmplitudes = leftSeriesItem
      ? applyAmplitudeContrast(leftSeriesItem.amplitudes, amplitudeContrast)
      : [];
    const rightAmplitudes = rightSeriesItem
      ? applyAmplitudeContrast(rightSeriesItem.amplitudes, amplitudeContrast)
      : [];

    // 1. Generate Left semisphere points (original)
    // Angles: 0.5*PI (top) -> 1.5*PI (bottom)
    if (leftActive) {
      for (let j = 0; j < M; j++) {
        const u = j / (M - 1 || 1); // Time coordinate 0.0 -> 1.0
        const theta = 0.5 * Math.PI + u * Math.PI; // Go from top to bottom

        let waveOffset = 0;
        const amp = leftAmplitudes[j] ?? 0;

        if (displayMode === DisplayMode.ENVELOPE) {
          waveOffset = amp * amplitudeScale;
        } else {
          // Continuous integration phase parameter
          const phase =
            leftSeriesItem.harmonicOrder * cumulativePhase[j] * waveDensityMultiplier * 0.01;
          waveOffset = amp * amplitudeScale * Math.sin(phase);
        }

        const r = Math.max(1, (leftRadius + waveOffset) * leftScale);
        leftPoints.push({
          x: cx + r * Math.cos(theta),
          y: cy + r * Math.sin(theta)
        });
      }
    }

    // 2. Generate Right semisphere points (deformed)
    // Boundary lock: Time flows backwards from bottom to top
    // Angles: 1.5*PI (bottom) -> 2.5*PI (top)
    if (rightActive) {
      for (let p = 0; p < M; p++) {
        const v = p / (M - 1 || 1); // Interpolation coordinate 0.0 -> 1.0
        const theta = 1.5 * Math.PI + v * Math.PI; // Go from bottom to top
        
        // Reversed lookup: angle 1.5*PI corresponds to t = T (j = M-1)
        // angle 2.5*PI corresponds to t = 0 (j = 0)
        const j = (M - 1) - p;
        const amp = rightAmplitudes[j] ?? 0;

        let waveOffset = 0;
        if (displayMode === DisplayMode.ENVELOPE) {
          waveOffset = amp * amplitudeScale;
        } else {
          const phase =
            rightSeriesItem.harmonicOrder * cumulativePhase[j] * waveDensityMultiplier * 0.01;
          waveOffset = amp * amplitudeScale * Math.sin(phase);
        }

        const r = Math.max(1, (rightRadius + waveOffset) * rightScale);
        rightPoints.push({
          x: cx + r * Math.cos(theta),
          y: cy + r * Math.sin(theta)
        });
      }
    }

    result.push({
      harmonicOrder: leftSeriesItem?.harmonicOrder ?? rightSeriesItem?.harmonicOrder ?? k + 1,
      leftPoints,
      rightPoints
    });
  }

  return result;
}

/**
 * Compiles track paths into raw standalone Illustrator/Figma compliant black SVGs
 */
export function generateStandaloneSVGString(
  trackLines: TrackLinePoints[],
  canvasWidth: number,
  canvasHeight: number,
  radiusMax?: number,
): string {
  let pathsXml = "";
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const resolvedGuideRadius = inferGuideRadius(trackLines, cx, cy, radiusMax);
  const guideCircleXml =
    typeof resolvedGuideRadius === "number"
      ? `  <circle cx="${cx}" cy="${cy}" r="${resolvedGuideRadius}" stroke="#000000" stroke-width="1" fill="none" class="radius-max-guide" />\n`
      : "";

  trackLines.forEach((tl) => {
    // 1. Compile Left Hemisphere path
    if (tl.leftPoints.length > 0) {
      const d = tl.leftPoints.reduce((acc, pt, idx) => {
        return acc + (idx === 0 ? `M ${pt.x.toFixed(2)},${pt.y.toFixed(2)}` : ` L ${pt.x.toFixed(2)},${pt.y.toFixed(2)}`);
      }, "");
      pathsXml += `  <path d="${d}" stroke="#000000" stroke-width="1" fill="none" class="left-track-${tl.harmonicOrder}" />\n`;
    }

    // 2. Compile Right Hemisphere path
    if (tl.rightPoints.length > 0) {
      const d = tl.rightPoints.reduce((acc, pt, idx) => {
        return acc + (idx === 0 ? `M ${pt.x.toFixed(2)},${pt.y.toFixed(2)}` : ` L ${pt.x.toFixed(2)},${pt.y.toFixed(2)}`);
      }, "");
      pathsXml += `  <path d="${d}" stroke="#000000" stroke-width="1" fill="none" class="right-track-${tl.harmonicOrder}" />\n`;
    }
  });

  return `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}">
  <g id="specular-rumination-voiceprint">
${guideCircleXml}${pathsXml}  </g>
</svg>`;
}
