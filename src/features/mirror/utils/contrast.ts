function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

export function applyAmplitudeContrast(amplitudes: number[], slope: number): number[] {
  if (amplitudes.length === 0) {
    return [];
  }

  if (!Number.isFinite(slope) || slope <= 0) {
    return amplitudes.map((value) => clamp01(value));
  }

  const mean = amplitudes.reduce((sum, value) => sum + value, 0) / amplitudes.length;
  const contrasted = amplitudes.map((value) => {
    return 1 / (1 + Math.exp(-slope * (value - mean)));
  });
  const contrastedMean = contrasted.reduce((sum, value) => sum + value, 0) / contrasted.length;

  return contrasted.map((value) => clamp01(value - contrastedMean + mean));
}
