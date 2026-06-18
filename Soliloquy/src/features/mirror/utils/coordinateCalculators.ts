/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VoiceprintData, VoiceprintTrack, RenderConfig, DisplayMode } from "../types";

export interface Point2D {
  x: number;
  y: number;
}

export interface TrackLinePoints {
  harmonicOrder: number;
  leftPoints: Point2D[];
  rightPoints: Point2D[];
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
    nLeft,
    nRight,
    radiusMin,
    radiusMax,
    energyInfluence,
    amplitudeScale,
    waveDensityMultiplier
  } = config;

  const M = data.sampleCount;
  const totalOriginalTracks = data.tracks.length;
  
  // Decide how many tracks to generate based on limits
  const maxActiveTracks = Math.max(nLeft, nRight);
  const result: TrackLinePoints[] = [];

  for (let k = 0; k < maxActiveTracks; k++) {
    // Left channel parameters
    const leftActive = k < nLeft && k < totalOriginalTracks;
    const rightActive = k < nRight && k < deformedTracks.length;

    if (!leftActive && !rightActive) continue;

    // Use original track's average energy for BOTH left and right baseline radii
    // to keep symmetric circles matching precisely at boundaries.
    const origTrack = k < totalOriginalTracks ? data.tracks[k] : data.tracks[totalOriginalTracks - 1];
    const avgEnergy = origTrack ? origTrack.averageEnergy : 0.1;

    // Compute identical baseline radius for track order k
    // We use a non-linear spacing order (power 1.2) to design highly musical orbits
    const leftRatio = nLeft > 1 ? k / (nLeft - 1) : 0.5;
    const rightRatio = nRight > 1 ? k / (nRight - 1) : 0.5;
    
    // Choose track baseline radius
    const ratio = Math.max(leftRatio, rightRatio); // or order based
    const orbitBaseline = radiusMin + Math.pow(k / Math.max(maxActiveTracks - 1, 1), 1.25) * (radiusMax - radiusMin);
    
    // Shift baseline radius dynamically according to voiceprint energy
    const r_base = orbitBaseline + energyInfluence * avgEnergy * (radiusMax - radiusMin);

    const leftPoints: Point2D[] = [];
    const rightPoints: Point2D[] = [];

    // 1. Generate Left semisphere points (original)
    // Angles: 0.5*PI (top) -> 1.5*PI (bottom)
    if (leftActive) {
      const track = data.tracks[k];
      for (let j = 0; j < M; j++) {
        const u = j / (M - 1 || 1); // Time coordinate 0.0 -> 1.0
        const theta = 0.5 * Math.PI + u * Math.PI; // Go from top to bottom

        let waveOffset = 0;
        const amp = track.amplitudes[j];

        if (displayMode === DisplayMode.ENVELOPE) {
          waveOffset = amp * amplitudeScale;
        } else {
          // Continuous integration phase parameter
          const phase = (k + 1) * cumulativePhase[j] * waveDensityMultiplier * 0.01;
          waveOffset = amp * amplitudeScale * Math.sin(phase);
        }

        const r = Math.max(1, r_base + waveOffset);
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
      const track = deformedTracks[k];
      for (let p = 0; p < M; p++) {
        const v = p / (M - 1 || 1); // Interpolation coordinate 0.0 -> 1.0
        const theta = 1.5 * Math.PI + v * Math.PI; // Go from bottom to top
        
        // Reversed lookup: angle 1.5*PI corresponds to t = T (j = M-1)
        // angle 2.5*PI corresponds to t = 0 (j = 0)
        const j = (M - 1) - p;
        const amp = track.amplitudes[j];

        let waveOffset = 0;
        if (displayMode === DisplayMode.ENVELOPE) {
          waveOffset = amp * amplitudeScale;
        } else {
          const phase = (k + 1) * cumulativePhase[j] * waveDensityMultiplier * 0.01;
          waveOffset = amp * amplitudeScale * Math.sin(phase);
        }

        const r = Math.max(1, r_base + waveOffset);
        rightPoints.push({
          x: cx + r * Math.cos(theta),
          y: cy + r * Math.sin(theta)
        });
      }
    }

    result.push({
      harmonicOrder: k + 1,
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
  canvasHeight: number
): string {
  let pathsXml = "";

  trackLines.forEach((tl) => {
    // 1. Compile Left Hemisphere path
    if (tl.leftPoints.length > 0) {
      const d = tl.leftPoints.reduce((acc, pt, idx) => {
        return acc + (idx === 0 ? `M ${pt.x.toFixed(2)},${pt.y.toFixed(2)}` : ` L ${pt.x.toFixed(2)},${pt.y.toFixed(2)}`);
      }, "");
      pathsXml += `  <path d="${d}" stroke="#000000" stroke-width="1.0" fill="none" class="left-track-${tl.harmonicOrder}" />\n`;
    }

    // 2. Compile Right Hemisphere path
    if (tl.rightPoints.length > 0) {
      const d = tl.rightPoints.reduce((acc, pt, idx) => {
        return acc + (idx === 0 ? `M ${pt.x.toFixed(2)},${pt.y.toFixed(2)}` : ` L ${pt.x.toFixed(2)},${pt.y.toFixed(2)}`);
      }, "");
      pathsXml += `  <path d="${d}" stroke="#000000" stroke-width="1.0" fill="none" class="right-track-${tl.harmonicOrder}" />\n`;
    }
  });

  return `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}">
  <g id="specular-rumination-voiceprint">
${pathsXml}  </g>
</svg>`;
}
