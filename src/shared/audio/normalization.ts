export const DEFAULT_TARGET_RMS = 0.12;
export const DEFAULT_MAX_PEAK = 0.98;

export function calculateRms(samples: ArrayLike<number>): number {
  if (samples.length === 0) {
    return 0;
  }

  let sum = 0;
  for (let index = 0; index < samples.length; index++) {
    const sample = samples[index] ?? 0;
    sum += sample * sample;
  }

  return Math.sqrt(sum / samples.length);
}

export function calculatePeak(samples: ArrayLike<number>): number {
  let peak = 0;
  for (let index = 0; index < samples.length; index++) {
    peak = Math.max(peak, Math.abs(samples[index] ?? 0));
  }
  return peak;
}

export function normalizeAudioSamples(
  samples: ArrayLike<number>,
  {
    targetRms,
    maxPeak = DEFAULT_MAX_PEAK,
  }: {
    targetRms?: number;
    maxPeak?: number;
  } = {},
): Float32Array {
  const output = new Float32Array(samples.length);
  for (let index = 0; index < samples.length; index++) {
    output[index] = samples[index] ?? 0;
  }

  const rms = calculateRms(output);
  const peak = calculatePeak(output);

  let gain = 1;
  if (typeof targetRms === 'number' && targetRms > 0 && rms > 0) {
    gain = targetRms / rms;
  }

  if (peak > 0) {
    gain = Math.min(gain, maxPeak / peak);
  }

  for (let index = 0; index < output.length; index++) {
    output[index] = Math.max(-maxPeak, Math.min(maxPeak, output[index] * gain));
  }

  return output;
}
