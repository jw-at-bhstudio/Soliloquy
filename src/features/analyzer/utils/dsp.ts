/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnalyzedAudio, HarmonicTrack } from '../types';
import { DEFAULT_TARGET_RMS, calculateRms, normalizeAudioSamples } from '../../../shared/audio/normalization';

/**
 * Applies a Hanning window of length M to an array of inputs
 */
function applyHanningWindow(data: Float32Array | number[]): Float32Array {
  const M = data.length;
  const result = new Float32Array(M);
  for (let n = 0; n < M; n++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (M - 1)));
    result[n] = data[n] * w;
  }
  return result;
}

/**
 * Center clipping function to sharpen periodic autocorrelation peaks and remove formant structures.
 * CL = eta * max(|x|), where eta is typically around 0.3.
 */
function centerClip(frame: Float32Array, eta: number = 0.3): Float32Array {
  const M = frame.length;
  let maxAbs = 0;
  for (let i = 0; i < M; i++) {
    const abs = Math.abs(frame[i]);
    if (abs > maxAbs) maxAbs = abs;
  }

  const threshold = eta * maxAbs;
  const clipped = new Float32Array(M);

  for (let i = 0; i < M; i++) {
    const val = frame[i];
    if (val > threshold) {
      clipped[i] = val - threshold;
    } else if (val < -threshold) {
      clipped[i] = val + threshold;
    } else {
      clipped[i] = 0;
    }
  }

  return clipped;
}

/**
 * Calculates F0 using Center-Clipped Autocorrelation
 * F0 limits: 80Hz - 500Hz (Human Speech F0 interval)
 */
function estimateFrameF0(
  frame: Float32Array,
  sampleRate: number,
  silenceThreshold: number = 0.007
): { f0: number; rms: number } {
  const M = frame.length;
  
  // 1. Calculate RMS energy
  let sumSq = 0;
  for (let i = 0; i < M; i++) {
    sumSq += frame[i] * frame[i];
  }
  const rms = Math.sqrt(sumSq / M);

  // If energy is too low, classify as silence/unvoiced
  if (rms < silenceThreshold) {
    return { f0: 0, rms };
  }

  // 2. Perform Center Clipping
  const clipped = centerClip(frame, 0.3);

  // 3. Autocorrelation in human speech lag range
  // Lag tau correspond to frequency: f = sampleRate / tau -> tau = sampleRate / f
  const minLag = Math.floor(sampleRate / 500); // For 44.1kHz: ~88 samples (500Hz)
  const maxLag = Math.ceil(sampleRate / 80);   // For 44.1kHz: ~551 samples (80Hz)

  let r0 = 0;
  for (let i = 0; i < M; i++) {
    r0 += clipped[i] * clipped[i];
  }

  if (r0 < 1e-6) {
    return { f0: 0, rms };
  }

  const R = new Float32Array(maxLag + 1);
  let maxRVal = -Infinity;
  let maxLagIndex = -1;

  for (let tau = minLag; tau <= maxLag; tau++) {
    let sum = 0;
    // Compute autocorrelation for this lag
    const limit = M - tau;
    for (let n = 0; n < limit; n++) {
      sum += clipped[n] * clipped[n + tau];
    }
    R[tau] = sum;

    if (sum > maxRVal) {
      maxRVal = sum;
      maxLagIndex = tau;
    }
  }

  // Voiced vs Unvoiced decision based on relative correlation peak strength
  // Standard speech pitch detection expects R(tau) / R(0) to exceed a certain value (e.g. 0.25)
  const normPeak = maxRVal / r0;
  if (normPeak < 0.22 || maxLagIndex === -1) {
    return { f0: 0, rms };
  }

  // 4. Parabolic refinement to get sub-sample precision
  let refinedLag = maxLagIndex;
  const p = maxLagIndex;
  if (p > minLag && p < maxLag) {
    const alpha = R[p - 1];
    const beta = R[p];
    const gamma = R[p + 1];
    
    const denom = alpha - 2 * beta + gamma;
    if (Math.abs(denom) > 1e-5) {
      const delta = (alpha - gamma) / (2 * denom);
      refinedLag = p + delta;
    }
  }

  const f0 = sampleRate / refinedLag;
  
  // Double-check speech F0 boundaries
  if (f0 >= 80 && f0 <= 500) {
    return { f0, rms };
  }

  return { f0: 0, rms };
}

/**
 * Computes the amplitude at a precise frequency f using custom local DFT
 * w(n) is a Hanning window
 */
function extractFrequencyAmplitude(
  frame: Float32Array,
  f: number,
  sampleRate: number
): number {
  const M = frame.length;
  if (f <= 1e-4 || f >= sampleRate / 2) {
    return 0;
  }

  // Prepare windowned frame
  let uSum = 0; // Sum of Hanning window coefficients
  let dftReal = 0;
  let dftImag = 0;

  for (let n = 0; n < M; n++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (M - 1)));
    uSum += w;

    const angle = (2 * Math.PI * f * n) / sampleRate;
    const windowedSample = frame[n] * w;

    dftReal += windowedSample * Math.cos(angle);
    dftImag += windowedSample * Math.sin(angle);
  }

  // Extract Magnitude
  const mag = Math.sqrt(dftReal * dftReal + dftImag * dftImag);

  // Scaled Peak Sinusoid Amplitude
  // Formula: A = (2 / U) * Mag
  return (2 * mag) / uSum;
}

/**
 * Smooth arrays to eliminate single-frame octaval pitch jumps and spikes using a 3-point median-like filter
 */
function smoothF0(f0: number[]): number[] {
  const smoothed = [...f0];
  const len = f0.length;
  if (len < 3) return smoothed;

  for (let i = 1; i < len - 1; i++) {
    const prev = f0[i - 1];
    const curr = f0[i];
    const next = f0[i + 1];

    if (curr > 0 && prev > 0 && next > 0) {
      const sorted = [prev, curr, next].sort((a, b) => a - b);
      const median = sorted[1];
      // If the current pitch jumps more than 50% from the median of its neighbors, smooth it
      if (Math.abs(curr - median) / median > 0.4) {
        smoothed[i] = median;
      }
    } else if (curr > 0 && prev === 0 && next === 0) {
      // Isolated single frame noise
      smoothed[i] = 0;
    } else if (curr === 0 && prev > 0 && next > 0) {
      // Small silent gap repair
      smoothed[i] = (prev + next) / 2;
    }
  }

  return smoothed;
}

/**
 * High-performance full offline DSP analysis pipeline
 */
export function analyzeAudioBuffer(
  audioData: Float32Array,
  sampleRate: number,
  name: string = "Recorded Audio",
  setNumHarmonics: number = 7
): AnalyzedAudio {
  const frameSize = 2048;
  const hopSize = 1024; // 50% overlap
  const totalSamples = audioData.length;
  const duration = totalSamples / sampleRate;

  // Compute total overlap frames
  const frameCount = Math.max(0, Math.floor((totalSamples - frameSize) / hopSize)) + 1;

  const rawF0 = new Array<number>(frameCount);
  const rms = new Array<number>(frameCount);
  const times = new Array<number>(frameCount);

  // 1. First pass: Get RMS energy and track F0 (Fundatmental F0)
  for (let k = 0; k < frameCount; k++) {
    const startIdx = k * hopSize;
    const endIdx = startIdx + frameSize;
    const frame = new Float32Array(frameSize);

    // Padding with zero if clip runs short
    for (let i = 0; i < frameSize; i++) {
      const ptr = startIdx + i;
      frame[i] = ptr < totalSamples ? audioData[ptr] : 0;
    }

    const { f0, rms: r } = estimateFrameF0(frame, sampleRate, 0.005);
    rawF0[k] = f0;
    rms[k] = r;
    times[k] = (startIdx + frameSize / 2) / sampleRate; // Midpoint time of frame
  }

  // Ensure beautiful lines by smoothing track pitch contour
  const f0 = smoothF0(rawF0);

  // Initialize harmonics (3 to 8 tracks total: multiplier = 1, 2, ..., N+1)
  // Total Tracks: 1 (F0) + N (harmonics). The code says: "这 1 个基频与 N 个倍频（N 为 2~7）于对应频点上的瞬时振幅"
  // Let's create tracks for multipliers: 1 (fundamental), and 2, 3, ..., 1+N
  const totalTracks = 1 + setNumHarmonics;
  const harmonics: HarmonicTrack[] = [];

  for (let hIndex = 0; hIndex < totalTracks; hIndex++) {
    harmonics.push({
      index: hIndex,
      multiplier: hIndex + 1,
      amplitudes: new Array<number>(frameCount).fill(0),
      frequencies: new Array<number>(frameCount).fill(0),
    });
  }

  // 2. Second pass: DFT harmonic extraction matching track frequencies
  for (let k = 0; k < frameCount; k++) {
    const currentF0 = f0[k];
    const startIdx = k * hopSize;
    const frame = new Float32Array(frameSize);
    
    for (let i = 0; i < frameSize; i++) {
      const ptr = startIdx + i;
      frame[i] = ptr < totalSamples ? audioData[ptr] : 0;
    }

    for (let hIndex = 0; hIndex < totalTracks; hIndex++) {
      const multiplier = hIndex + 1;
      const track = harmonics[hIndex];

      if (currentF0 > 0) {
        const hFreq = currentF0 * multiplier;
        track.frequencies[k] = hFreq;

        // Perform localized windowed DFT at target frequency
        const amp = extractFrequencyAmplitude(frame, hFreq, sampleRate);
        track.amplitudes[k] = amp;
      } else {
        track.frequencies[k] = 0;
        track.amplitudes[k] = 0;
      }
    }
  }

  return {
    name,
    duration,
    sampleRate,
    frameCount,
    f0,
    harmonics,
    times,
    audioData,
    rms,
  };
}

/**
 * Synthesizes a high-fidelity continuous wave AudioBuffer from extracted amplitudes
 * and frequencies for designated enabled tracks. Perfect, click-free audio playback!
 */
export function synthesizeAdditiveSynthesizer(
  analysis: AnalyzedAudio,
  enabledTracks: boolean[], // Indexes mapping to harmonics array
  options: {
    sampleRate?: number;
    targetRms?: number;
  } = {},
): Float32Array {
  const sampleRate = options.sampleRate ?? 44100;
  const duration = analysis.duration;
  const totalSamples = Math.round(duration * sampleRate);
  const synthesized = new Float32Array(totalSamples);

  // We have 1+N tracks
  const tracks = analysis.harmonics;
  const numTracks = tracks.length;

  // Track phase storage to support seamless continuous time integration
  const phases = new Float64Array(numTracks).fill(0);

  // Find frames parameters
  const frameTimes = analysis.times;
  const frameCount = analysis.frameCount;

  if (frameCount === 0) return synthesized;

  let activeCount = 0;
  for (let t = 0; t < numTracks; t++) {
    if (enabledTracks[t] !== false) {
      activeCount++;
    }
  }

  if (activeCount === 0) return synthesized;

  // Step across every single sample to integrate continuous waveforms
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    // 1. Locate the nearest or sandwich frames for interpolation
    let leftFrame = 0;
    let rightFrame = 0;
    let weight = 0;

    if (t <= frameTimes[0]) {
      leftFrame = 0;
      rightFrame = 0;
      weight = 0;
    } else if (t >= frameTimes[frameCount - 1]) {
      leftFrame = frameCount - 1;
      rightFrame = frameCount - 1;
      weight = 0;
    } else {
      // Binary search or linear search for adjacent frame index
      let found = 0;
      for (let k = 0; k < frameCount - 1; k++) {
        if (t >= frameTimes[k] && t <= frameTimes[k + 1]) {
          found = k;
          break;
        }
      }
      leftFrame = found;
      rightFrame = found + 1;
      
      const t1 = frameTimes[leftFrame];
      const t2 = frameTimes[rightFrame];
      weight = (t - t1) / (t2 - t1);
    }

    let sampleVal = 0;

    // 2. Synthesize & add each enabled harmonic track
    for (let trackIdx = 0; trackIdx < numTracks; trackIdx++) {
      if (enabledTracks[trackIdx] === false) continue;

      const track = tracks[trackIdx];
      
      // Interpolate amplitude and frequency for smooth morphing
      const amp1 = track.amplitudes[leftFrame];
      const amp2 = track.amplitudes[rightFrame];
      const amp = amp1 + weight * (amp2 - amp1);

      const freq1 = track.frequencies[leftFrame];
      const freq2 = track.frequencies[rightFrame];
      const freq = freq1 + weight * (freq2 - freq1);

      if (freq > 0 && amp > 0) {
        // Increment phase continuously based on local instantaneous frequency
        const dPhase = (2 * Math.PI * freq) / sampleRate;
        phases[trackIdx] = (phases[trackIdx] + dPhase) % (Math.PI * 2);

        // Sum amplitude
        sampleVal += amp * Math.sin(phases[trackIdx]);
      } else {
        // Fade phase tracking or let it decay naturally
        // If voice goes silent, amplitude goes to zero. Keep accumulating zero phase increment.
      }
    }

    synthesized[i] = sampleVal;
  }

  // Smooth raw buffer at the very start and finish with short fade in/out (5ms) to prevent audio pop clicks
  const fadeSize = Math.min(Math.round(sampleRate * 0.005), totalSamples);
  for (let i = 0; i < fadeSize; i++) {
    const fadeRatio = i / fadeSize;
    synthesized[i] *= fadeRatio;
    synthesized[totalSamples - 1 - i] *= fadeRatio;
  }

  const referenceRms = (options.targetRms ?? calculateRms(analysis.audioData)) || DEFAULT_TARGET_RMS;
  return normalizeAudioSamples(synthesized, { targetRms: referenceRms });
}

/**
 * Formats a given time duration to MM:SS.CC (Minutes, Seconds, Centiseconds)
 */
export function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  const centi = Math.floor((seconds % 1) * 100);
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${centi.toString().padStart(2, '0')}`;
}
