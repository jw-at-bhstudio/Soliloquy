export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
}

export function standardDeviation(values: number[]): number {
  const avg = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length || 1);

  return Math.sqrt(variance);
}
