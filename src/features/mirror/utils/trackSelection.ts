import { SideRenderMode, VoiceprintTrack } from '../types';
import type { TrackRadiusSlot } from './radiusMapping';

export interface RenderSeries {
  trackIndex: number;
  harmonicOrder: number;
  amplitudes: number[];
  averageEnergy: number;
  radius?: number;
}

export function createDefaultTrackSelection(maxTracks: number, preferredCount: number): number[] {
  const safeMaxTracks = Math.max(0, maxTracks);
  const count = Math.min(safeMaxTracks, Math.max(0, preferredCount));
  return Array.from({ length: count }, (_, index) => index);
}

export function sanitizeTrackSelection(indices: number[], maxTracks: number): number[] {
  const valid = new Set<number>();
  for (const index of indices) {
    if (Number.isInteger(index) && index >= 0 && index < maxTracks) {
      valid.add(index);
    }
  }
  return [...valid].sort((left, right) => left - right);
}

function averageEnergy(amplitudes: number[]): number {
  if (amplitudes.length === 0) {
    return 0;
  }
  return amplitudes.reduce((sum, value) => sum + value, 0) / amplitudes.length;
}

function weightedAverage(values: number[], weights: number[]): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (let index = 0; index < values.length; index++) {
    const value = values[index] ?? 0;
    const weight = weights[index] ?? 0;
    weightedSum += value * weight;
    totalWeight += weight;
  }

  if (totalWeight <= 0) {
    return values[0] ?? 0;
  }

  return weightedSum / totalWeight;
}

export function resolveTrackRenderSeries(
  tracks: VoiceprintTrack[],
  selectedIndices: number[],
  mode: SideRenderMode,
  slots?: TrackRadiusSlot[],
): RenderSeries[] {
  const sanitizedIndices = sanitizeTrackSelection(selectedIndices, tracks.length);
  const slotByTrack = slots ? new Map(slots.map((slot) => [slot.trackIndex, slot])) : null;
  if (sanitizedIndices.length === 0) {
    return [];
  }

  if (mode === SideRenderMode.SEPARATE) {
    return sanitizedIndices.map((index) => {
      const track = tracks[index];
      const slot = slotByTrack?.get(index);
      return {
        trackIndex: index,
        harmonicOrder: track.harmonicOrder,
        amplitudes: [...track.amplitudes],
        averageEnergy: track.averageEnergy,
        radius: slot?.radius,
      };
    });
  }

  const mergedAmplitudes = new Array<number>(tracks[0]?.amplitudes.length ?? 0).fill(0);
  for (const index of sanitizedIndices) {
    const track = tracks[index];
    for (let frameIndex = 0; frameIndex < mergedAmplitudes.length; frameIndex++) {
      mergedAmplitudes[frameIndex] += track.amplitudes[frameIndex] ?? 0;
    }
  }

  const mergedAverageEnergy = averageEnergy(mergedAmplitudes);
  const selectedSlots = sanitizedIndices
    .map((index) => slotByTrack?.get(index))
    .filter((slot): slot is TrackRadiusSlot => Boolean(slot));
  const slotWeights = selectedSlots.map((slot) => Math.max(slot.averageEnergy, 0));
  const mergedRadius =
    selectedSlots.length > 0
      ? weightedAverage(
          selectedSlots.map((slot) => slot.radius),
          slotWeights,
        )
      : undefined;

  return [
    {
      trackIndex: sanitizedIndices[0],
      harmonicOrder: tracks[sanitizedIndices[0]].harmonicOrder,
      amplitudes: mergedAmplitudes,
      averageEnergy: mergedAverageEnergy,
      radius: mergedRadius,
    },
  ];
}
