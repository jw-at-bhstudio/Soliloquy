import { RadiusMode, VoiceprintTrack } from '../types';

const DEFAULT_FREQUENCY_MIN = 80;
const DEFAULT_FREQUENCY_MAX = 2000;

export interface FrequencyRange {
  frequencyMin: number;
  frequencyMax: number;
}

export interface TrackRadiusSlot {
  trackIndex: number;
  harmonicOrder: number;
  averageEnergy: number;
  representativeFrequency: number;
  slotIndex: number;
  frequencyRadius: number;
  energyRadius: number;
  radius: number;
}

export interface ComputeTrackRadiusSlotsInput {
  tracks: VoiceprintTrack[];
  f0: number[];
  radiusMode?: RadiusMode;
  frequencyMin?: number;
  frequencyMax?: number;
  radiusMin: number;
  radiusMax: number;
  energyInfluence?: number;
}

export function sanitizeFrequencyRange(
  frequencyMin: number,
  frequencyMax: number,
): FrequencyRange {
  if (
    !Number.isFinite(frequencyMin) ||
    !Number.isFinite(frequencyMax) ||
    frequencyMin <= 0 ||
    frequencyMax <= 0
  ) {
    return {
      frequencyMin: DEFAULT_FREQUENCY_MIN,
      frequencyMax: DEFAULT_FREQUENCY_MAX,
    };
  }

  if (frequencyMax <= frequencyMin) {
    return {
      frequencyMin,
      frequencyMax: frequencyMin + 1,
    };
  }

  return {
    frequencyMin,
    frequencyMax,
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function interpolateRadius(
  slotIndex: number,
  maxSlotIndex: number,
  radiusMin: number,
  radiusMax: number,
): number {
  if (maxSlotIndex <= 0) {
    return radiusMin;
  }

  const normalized = clamp01(slotIndex / maxSlotIndex);
  return radiusMin + normalized * (radiusMax - radiusMin);
}

function interpolateByValue(
  value: number,
  valueMin: number,
  valueMax: number,
  radiusMin: number,
  radiusMax: number,
): number {
  if (!Number.isFinite(value) || !Number.isFinite(valueMin) || !Number.isFinite(valueMax)) {
    return radiusMin;
  }

  if (valueMax <= valueMin) {
    return radiusMin;
  }

  const normalized = clamp01((value - valueMin) / (valueMax - valueMin));
  return radiusMin + normalized * (radiusMax - radiusMin);
}

function getAveragePositiveF0(f0: number[], fallbackFrequency: number): number {
  const validF0 = f0.filter((value) => Number.isFinite(value) && value > 0);
  if (validF0.length === 0) {
    return fallbackFrequency;
  }

  return validF0.reduce((sum, value) => sum + value, 0) / validF0.length;
}

function getStableSlotIndex(track: VoiceprintTrack, trackIndex: number): number {
  if (Number.isInteger(track.harmonicOrder) && track.harmonicOrder > 0) {
    return track.harmonicOrder - 1;
  }
  return trackIndex;
}

export function computeTrackRadiusSlots({
  tracks,
  f0,
  radiusMode = RadiusMode.ABSOLUTE_FREQUENCY,
  frequencyMin = DEFAULT_FREQUENCY_MIN,
  frequencyMax = DEFAULT_FREQUENCY_MAX,
  radiusMin,
  radiusMax,
  energyInfluence = 0,
}: ComputeTrackRadiusSlotsInput): TrackRadiusSlot[] {
  if (tracks.length === 0) {
    return [];
  }

  const safeRange = sanitizeFrequencyRange(frequencyMin, frequencyMax);
  const safeEnergyInfluence = clamp01(energyInfluence);
  const averageF0 = getAveragePositiveF0(f0, safeRange.frequencyMin);
  const amplitudeValues = tracks.map((track) => track.averageEnergy);
  const amplitudeMin = Math.min(...amplitudeValues);
  const amplitudeMax = Math.max(...amplitudeValues);
  const maxStableSlotIndex = tracks.reduce((maxSlotIndex, track, trackIndex) => {
    return Math.max(maxSlotIndex, getStableSlotIndex(track, trackIndex));
  }, 0);

  const frequencySlots = tracks.map((track, trackIndex) => {
    const slotIndex = getStableSlotIndex(track, trackIndex);
    const representativeFrequency = averageF0 * Math.max(track.harmonicOrder, 1);
    const normalizedFrequency = clamp01(
      (representativeFrequency - safeRange.frequencyMin) /
        (safeRange.frequencyMax - safeRange.frequencyMin),
    );
    const frequencyRadius =
      radiusMode === RadiusMode.RELATIVE_HARMONIC
        ? interpolateRadius(slotIndex, maxStableSlotIndex, radiusMin, radiusMax)
        : radiusMin + normalizedFrequency * (radiusMax - radiusMin);

    return {
      trackIndex,
      harmonicOrder: track.harmonicOrder,
      averageEnergy: track.averageEnergy,
      representativeFrequency,
      slotIndex,
      frequencyRadius,
    };
  });

  return frequencySlots.map((slot) => {
    const energyRadius = interpolateByValue(
      slot.averageEnergy,
      amplitudeMin,
      amplitudeMax,
      radiusMin,
      radiusMax,
    );

    return {
      ...slot,
      energyRadius,
      radius:
        slot.frequencyRadius * (1 - safeEnergyInfluence) + energyRadius * safeEnergyInfluence,
    };
  });
}
