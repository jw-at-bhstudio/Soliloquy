/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VoiceprintTrack, DeformationParams } from "../types";

/**
 * Wavefolding helper: folds values exceeding the threshold using sine-shaping.
 * This introduces physical folding folds.
 */
export function wavefold(value: number, threshold: number): number {
  if (threshold <= 0.01) return 0;
  if (Math.abs(value) <= threshold) {
    return value;
  }
  // Standard West Coast synthesis wavefolding using sine shaper:
  // Maps values outside [-threshold, threshold] gracefully into a sinusoid folding back.
  return threshold * Math.sin((Math.PI / (2 * threshold)) * value);
}

/**
 * Applies the three-variable deformation pipeline on the amplitude curves:
 * 1. Mind Entanglement (Time/Phase Warping indices)
 * 2. Feedback Residue (First-order delay feedback)
 * 3. Inward Folding Collapse (Sine Shaper waveholder)
 */
export function applyDeformations(
  originalTracks: VoiceprintTrack[],
  params: DeformationParams
): VoiceprintTrack[] {
  const { feedbackDecay, foldThreshold, ruminationFrequency, ruminationStrength } = params;
  const numTracks = originalTracks.length;
  if (numTracks === 0) return [];
  
  const sampleCount = originalTracks[0].amplitudes.length;

  return originalTracks.map((track) => {
    // 1. Time warping / Mental Entanglement modulation
    // We map each target index j to a warped index in the original track
    const warpedAmps = new Array<number>(sampleCount);
    
    for (let j = 0; j < sampleCount; j++) {
      const u = j / (sampleCount - 1 || 1); // 0.0 ~ 1.0
      
      // Calculate temporal modulation offset
      // If ruminationFrequency is 0, offset is 0.
      const modulation = Math.sin(ruminationFrequency * Math.PI * u);
      const warpedU = u + ruminationStrength * modulation;
      
      // Keep clamped in bounds
      const clampedU = Math.max(0, Math.min(1, warpedU));
      
      // Find fractional index & interpolate
      const fracIndex = clampedU * (sampleCount - 1);
      const idxFloor = Math.floor(fracIndex);
      const idxCeil = Math.min(sampleCount - 1, idxFloor + 1);
      const weight = fracIndex - idxFloor;
      
      const valFloor = track.amplitudes[idxFloor];
      const valCeil = track.amplitudes[idxCeil];
      
      warpedAmps[j] = valFloor * (1 - weight) + valCeil * weight;
    }

    // 2. Feedback echo residue decay (One-pass IIR delay)
    const feedbackAmps = new Array<number>(sampleCount);
    let prevOut = 0;
    for (let j = 0; j < sampleCount; j++) {
      // y[j] = x[j] + decay * y[j-1]
      const currentVal = warpedAmps[j];
      const outVal = currentVal + feedbackDecay * prevOut;
      feedbackAmps[j] = outVal;
      prevOut = outVal;
    }

    // 3. Wavefolder Collapse (Inward Fold threshold check)
    const finalAmps = feedbackAmps.map((val) => {
      return Math.abs(wavefold(val, foldThreshold));
    });

    // Recompute energy for the deformed track
    const sum = finalAmps.reduce((acc, v) => acc + v, 0);
    const averageEnergy = sum / sampleCount || 0.001;

    return {
      harmonicOrder: track.harmonicOrder,
      amplitudes: finalAmps,
      averageEnergy
    };
  });
}
