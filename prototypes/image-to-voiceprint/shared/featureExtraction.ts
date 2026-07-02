import { clamp, mean, standardDeviation } from './math.ts';

export interface ColumnFeatures {
  colEnergy: number;
  colContrast: number;
  centroidY: number;
  bandEnergy: number[];
  grayBuckets: number[];
}

export function splitBands(values: number[], bandCount = 8): number[][] {
  return Array.from({ length: bandCount }, (_, index) => {
    const start = Math.floor((index * values.length) / bandCount);
    const end = Math.floor(((index + 1) * values.length) / bandCount);

    return values.slice(start, Math.max(start + 1, end));
  });
}

export function quantizeGrayBands(values: number[]): number[] {
  const buckets = Array.from({ length: 8 }, () => 0);

  for (const value of values) {
    const bucketIndex = Math.min(7, Math.floor(clamp(value) * 8));
    buckets[bucketIndex] += 1;
  }

  const total = values.length || 1;
  return buckets.map((value) => value / total);
}

export function buildColumnFeaturesFromGray(values: number[]): ColumnFeatures {
  const colEnergy = mean(values);
  const colContrast = standardDeviation(values);
  const energySum = values.reduce((sum, value) => sum + value, 0) || 1;
  const centroidY =
    values.reduce(
      (sum, value, index) => sum + value * (index / Math.max(1, values.length - 1)),
      0,
    ) / energySum;

  return {
    colEnergy,
    colContrast,
    centroidY,
    bandEnergy: splitBands(values, 8).map((band) => mean(band)),
    grayBuckets: quantizeGrayBands(values),
  };
}
