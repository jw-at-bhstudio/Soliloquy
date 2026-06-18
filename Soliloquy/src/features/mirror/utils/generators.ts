/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VoiceprintData, VoiceprintTrack } from "../types";

/**
 * Generates a deeply textured, organic synthetic voiceprint
 * mimicking a human vowel resonance shift (e.g. "Ah" -> "Oh" -> "Mmm" with 4.5Hz vibrato)
 */
export function generateDemoVoiceprint(duration: number = 4.0, frameCount: number = 320): VoiceprintData {
  const timeArray: number[] = [];
  const f0Array: number[] = [];
  const totalHarmonics = 16;
  
  // Initialize tracks
  const trackDrafts: { harmonicOrder: number; amplitudes: number[] }[] = [];
  for (let k = 0; k < totalHarmonics; k++) {
    trackDrafts.push({
      harmonicOrder: k + 1,
      amplitudes: []
    });
  }

  for (let i = 0; i < frameCount; i++) {
    const t = (i / (frameCount - 1)) * duration;
    timeArray.push(t);

    // F0 base with beautiful micro-vibrato (approx 4.8 Hz) and slight organic jitter
    const vibrato = 4.5 * Math.sin(t * 2 * Math.PI * 4.8);
    const wander = 8.0 * Math.sin(t * 2 * Math.PI * 0.4);
    const noise = (Math.sin(t * 40) * Math.cos(t * 123) * 0.4);
    const f0 = 135.0 + vibrato + wander + noise;
    f0Array.push(f0);

    // Dynamic Formant Sweeps to simulate vowel sound transitions over time:
    // Formant 1 center frequency moves from 600Hz to 400Hz back to 500Hz
    const f1Center = 550 + 150 * Math.sin(t * Math.PI * 0.8);
    // Formant 2 center frequency moves from 1500Hz to 1000Hz
    const f2Center = 1200 + 400 * Math.cos(t * Math.PI * 0.6);

    for (let k = 0; k < totalHarmonics; k++) {
      const order = k + 1;
      const freq = order * f0;

      // Base decay based on harmonic number (lower order harmonics are usually stronger)
      let baseAmp = 1.0 / Math.pow(order, 0.85);

      // Superimpose resonance filters (Formants) with specific bandwidths
      const bw1 = 120.0; // Hz
      const bw2 = 250.0; // Hz
      
      const r1 = Math.exp(-Math.pow((freq - f1Center) / bw1, 2));
      const r2 = Math.exp(-Math.pow((freq - f2Center) / bw2, 2)) * 0.6;
      
      // Dynamic modulation to create pulse ripples (breathing/rumination effect)
      const dynamicPulse = 0.8 + 0.2 * Math.sin(t * 2 * Math.PI * 1.5 + order * 0.5);

      let finalAmp = baseAmp * (1.2 + r1 + r2) * dynamicPulse;

      // Add high frequency harmonic shimmer
      if (order > 8) {
        finalAmp *= (1.0 + 0.35 * Math.sin(t * 2 * Math.PI * 12.0));
      }

      // Add subtle noise floor & clamp to [0, 1]
      finalAmp += 0.015 * Math.sin(t * 80 + order * 7);
      finalAmp = Math.max(0.001, Math.min(1.0, finalAmp));

      trackDrafts[k].amplitudes.push(finalAmp);
    }
  }

  // Map to final voiceprint format & compute average energies
  const tracks: VoiceprintTrack[] = trackDrafts.map((td) => {
    const sum = td.amplitudes.reduce((acc, v) => acc + v, 0);
    const averageEnergy = sum / frameCount;
    return {
      harmonicOrder: td.harmonicOrder,
      amplitudes: td.amplitudes,
      averageEnergy
    };
  });

  return {
    time: timeArray,
    f0: f0Array,
    tracks,
    duration,
    sampleCount: frameCount
  };
}

/**
 * Validates whether an uploaded object conforms to the VoiceprintData JSON schema.
 * Returns parsed VoiceprintData or throws error with clear instructions.
 */
export function validateAndParseVoiceprint(input: any): VoiceprintData {
  if (!input || typeof input !== "object") {
    throw new Error("导入的数据不是有效的 JSON 对象。");
  }

  const { time, f0, tracks } = input;

  if (!Array.isArray(time) || time.length < 2) {
    throw new Error("缺少有效的 'time' 时间轴数组（长度至少为 2）。");
  }

  if (!Array.isArray(f0) || f0.length !== time.length) {
    throw new Error("缺少 'f0' 数组，或者它的长度同时间轴不一致。");
  }

  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new Error("缺少频轨数据 'tracks' 或为空。");
  }

  const parsedTracks: VoiceprintTrack[] = tracks.map((track: any, idx: number) => {
    if (!track || typeof track !== "object") {
      throw new Error(`轨道索引 [${idx}] 不是有效对象。`);
    }

    const order = typeof track.harmonicOrder === "number" ? track.harmonicOrder : idx + 1;
    if (!Array.isArray(track.amplitudes) || track.amplitudes.length !== time.length) {
      throw new Error(`轨道 [阶数:${order}] 的 amplitudes 数组长度与时间轴不符。`);
    }

    const amps = track.amplitudes.map((val: any) => {
      const num = Number(val);
      return isNaN(num) ? 0 : Math.max(0, Math.min(1, num));
    });

    const sum = amps.reduce((acc: number, v: number) => acc + v, 0);
    const averageEnergy = sum / amps.length;

    return {
      harmonicOrder: order,
      amplitudes: amps,
      averageEnergy
    };
  });

  return {
    time: time.map(Number),
    f0: f0.map(Number),
    tracks: parsedTracks,
    duration: time[time.length - 1] - time[0] || 1.0,
    sampleCount: time.length
  };
}
