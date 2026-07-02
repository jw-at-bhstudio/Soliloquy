import type { PrototypeVoiceprintData, PrototypeVoiceprintTrack } from './types.ts';

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
}

function rms(values: number[]): number {
  const power = values.reduce((sum, value) => sum + value * value, 0) / (values.length || 1);
  return Math.sqrt(power);
}

export function buildTimeAxis(sampleCount: number, duration: number): number[] {
  return Array.from({ length: sampleCount }, (_, index) => (duration * (index + 1)) / sampleCount);
}

export function buildEmptyTracks(sampleCount: number): PrototypeVoiceprintTrack[] {
  return Array.from({ length: 8 }, (_, index) => ({
    harmonicOrder: index + 1,
    amplitudes: Array.from({ length: sampleCount }, () => 0),
    averageEnergy: 0,
  }));
}

export function finalizeVoiceprint(input: {
  duration: number;
  time: number[];
  f0: number[];
  tracks: Array<{ harmonicOrder: number; amplitudes: number[] }>;
}): PrototypeVoiceprintData {
  const tracks = input.tracks.map((track) => {
    const amplitudes = track.amplitudes.map(clampUnit);

    return {
      harmonicOrder: track.harmonicOrder,
      amplitudes,
      averageEnergy: mean(amplitudes),
    };
  });

  const flattened = tracks.flatMap((track) => track.amplitudes);
  const voiceprint: PrototypeVoiceprintData = {
    time: input.time,
    f0: input.f0.map((value) => Math.max(0, value)),
    tracks,
    duration: input.duration,
    sampleCount: input.time.length,
    referencePeak: Math.max(0, ...flattened),
    referenceRms: rms(flattened),
  };

  validateVoiceprint(voiceprint);
  return voiceprint;
}

export function validateVoiceprint(data: PrototypeVoiceprintData): void {
  if (data.tracks.length !== 8) {
    throw new Error('expected exactly 8 harmonic tracks');
  }

  if (data.time.length !== data.sampleCount || data.f0.length !== data.sampleCount) {
    throw new Error('time and f0 must match sampleCount');
  }

  for (const track of data.tracks) {
    if (track.amplitudes.length !== data.sampleCount) {
      throw new Error('track length does not match sampleCount');
    }
  }

  for (let frame = 0; frame < data.sampleCount; frame += 1) {
    if (data.f0[frame] === 0) {
      const hasAmplitude = data.tracks.some((track) => (track.amplitudes[frame] ?? 0) > 0);
      if (hasAmplitude) {
        throw new Error('silent frame cannot contain amplitudes');
      }
    }
  }
}
