/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface HarmonicTrack {
  index: number; // 0 is base (1st harmonic), 1 is 2nd harmonic, etc.
  multiplier: number; // 1 for base, 2..8 for harmonics
  amplitudes: number[]; // Amplitude value per frame
  frequencies: number[]; // Frequency value per frame (multiplier * F0)
}

export interface AnalyzedAudio {
  name: string; // File name or record timestamp
  duration: number; // Duration in seconds
  sampleRate: number; // Sample rate in Hz
  frameCount: number; // Total number of parsed frames
  f0: number[]; // Fundamental frequencies list per frame
  harmonics: HarmonicTrack[]; // List of extracted harmonics
  times: number[]; // Match frame to time in seconds
  audioData: Float32Array; // Raw original audio mono samples
  rms: number[]; // Root-mean-square energy per frame
}

export interface PlaybackState {
  isPlaying: boolean;
  progress: number; // 0.0 to 1.0 representing position
  currentTime: number; // Current playback time in seconds
}
