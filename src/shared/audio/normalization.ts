export const DEFAULT_TARGET_RMS = 0.12;
export const DEFAULT_MAX_PEAK = 0.98;
export const DEFAULT_ROBUST_PEAK_QUANTILE = 0.995;
export const DEFAULT_ROBUST_PEAK_SAMPLE_STEP = 64;
export const DEFAULT_MAX_GAIN = 12;

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

export function calculateRobustPeak(
  samples: ArrayLike<number>,
  {
    quantile = DEFAULT_ROBUST_PEAK_QUANTILE,
    sampleStep = DEFAULT_ROBUST_PEAK_SAMPLE_STEP,
  }: {
    quantile?: number;
    sampleStep?: number;
  } = {},
): number {
  if (samples.length === 0) {
    return 0;
  }

  const safeQuantile = Number.isFinite(quantile)
    ? Math.max(0, Math.min(1, quantile))
    : DEFAULT_ROBUST_PEAK_QUANTILE;
  const safeSampleStep = Number.isFinite(sampleStep)
    ? Math.max(1, Math.floor(sampleStep))
    : DEFAULT_ROBUST_PEAK_SAMPLE_STEP;

  const sampled: number[] = [];
  for (let index = 0; index < samples.length; index += safeSampleStep) {
    sampled.push(Math.abs(samples[index] ?? 0));
  }

  if (sampled.length === 0) {
    return 0;
  }

  sampled.sort((a, b) => a - b);
  const qIndex = Math.min(
    sampled.length - 1,
    Math.max(0, Math.ceil((sampled.length - 1) * safeQuantile)),
  );
  return sampled[qIndex] ?? 0;
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

export function normalizeAudioSamplesByRobustPeak(
  samples: ArrayLike<number>,
  {
    targetPeak = DEFAULT_MAX_PEAK,
    maxPeak = DEFAULT_MAX_PEAK,
    quantile = DEFAULT_ROBUST_PEAK_QUANTILE,
    sampleStep = DEFAULT_ROBUST_PEAK_SAMPLE_STEP,
    maxGain = DEFAULT_MAX_GAIN,
  }: {
    targetPeak?: number;
    maxPeak?: number;
    quantile?: number;
    sampleStep?: number;
    maxGain?: number;
  } = {},
): Float32Array {
  const output = new Float32Array(samples.length);
  for (let index = 0; index < samples.length; index++) {
    output[index] = samples[index] ?? 0;
  }

  const peak = calculatePeak(output);
  const robustPeak = calculateRobustPeak(output, { quantile, sampleStep });

  let gain = 1;
  if (robustPeak > 0 && targetPeak > 0) {
    gain = targetPeak / robustPeak;
  }

  if (Number.isFinite(maxGain) && maxGain > 0) {
    gain = Math.min(gain, maxGain);
  }

  if (peak > 0) {
    gain = Math.min(gain, maxPeak / peak);
  }

  for (let index = 0; index < output.length; index++) {
    output[index] = Math.max(-maxPeak, Math.min(maxPeak, output[index] * gain));
  }

  return output;
}
