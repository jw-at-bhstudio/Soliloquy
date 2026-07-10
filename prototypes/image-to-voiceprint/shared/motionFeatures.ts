export interface MotionFeatureSource {
  grayBuckets: number[];
  centroidY: number;
  colContrast: number;
}

export interface MotionSeriesOptions {
  smoothingWindow?: number;
  threshold?: number;
  compression?: number;
}

export interface MotionSeries {
  raw: number[];
  filtered: number[];
}

export function smoothSeries(values: number[], windowSize: number): number[] {
  const radius = Math.max(0, Math.floor(windowSize / 2));

  return values.map((_, index) => {
    const start = Math.max(0, index - radius);
    const end = Math.min(values.length, index + radius + 1);
    const slice = values.slice(start, end);
    const sum = slice.reduce((total, value) => total + value, 0);

    return sum / Math.max(1, slice.length);
  });
}

export function compressMotion(value: number, threshold: number, compression: number): number {
  const trimmed = Math.max(0, value - threshold);
  return trimmed / (trimmed + Math.max(0.0001, compression));
}

function diffGrayBuckets(current: number[], previous: number[]): number {
  const length = Math.max(current.length, previous.length);
  let total = 0;

  for (let index = 0; index < length; index += 1) {
    total += Math.abs((current[index] ?? 0) - (previous[index] ?? 0));
  }

  return total;
}

function smoothGrayBucketSeries(features: MotionFeatureSource[], windowSize: number): number[][] {
  const bucketCount = Math.max(0, ...features.map((feature) => feature.grayBuckets.length));

  return features.map((feature, frameIndex) =>
    Array.from({ length: bucketCount }, (_, bucketIndex) => {
      const series = features.map((item) => item.grayBuckets[bucketIndex] ?? 0);
      return smoothSeries(series, windowSize)[frameIndex] ?? feature.grayBuckets[bucketIndex] ?? 0;
    }),
  );
}

export function buildMotionSeries(
  features: MotionFeatureSource[],
  options: MotionSeriesOptions = {},
): MotionSeries {
  const smoothingWindow = options.smoothingWindow ?? 3;
  const effectiveWindow = features.length < smoothingWindow ? 1 : smoothingWindow;
  const threshold = options.threshold ?? 0;
  const compression = options.compression ?? 0.15;

  const smoothedBuckets = smoothGrayBucketSeries(features, effectiveWindow);
  const centroidSeries = smoothSeries(features.map((feature) => feature.centroidY), effectiveWindow);
  const contrastSeries = smoothSeries(features.map((feature) => feature.colContrast), effectiveWindow);

  const raw = features.map((_, index) => {
    if (index === 0) {
      return 0;
    }

    return (
      0.5 * diffGrayBuckets(smoothedBuckets[index] ?? [], smoothedBuckets[index - 1] ?? []) +
      0.3 * Math.abs((centroidSeries[index] ?? 0) - (centroidSeries[index - 1] ?? 0)) +
      0.2 * Math.abs((contrastSeries[index] ?? 0) - (contrastSeries[index - 1] ?? 0))
    );
  });

  return {
    raw,
    filtered: raw.map((value) => compressMotion(value, threshold, compression)),
  };
}
