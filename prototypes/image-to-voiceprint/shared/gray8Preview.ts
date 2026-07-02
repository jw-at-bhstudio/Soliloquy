import { clamp } from './math.ts';

export function quantizeGrayValueToLevel(value: number): number {
  const bucket = Math.min(7, Math.floor(clamp(value) * 8));

  return Math.round((bucket / 7) * 255);
}

export function buildGray8PreviewPixels(columns: number[][]): {
  width: number;
  height: number;
  data: Uint8ClampedArray;
} {
  const width = columns.length;
  const height = columns[0]?.length ?? 0;
  const data = new Uint8ClampedArray(width * height * 4);

  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      const level = quantizeGrayValueToLevel(columns[x]?.[y] ?? 0);
      const index = (y * width + x) * 4;

      data[index] = level;
      data[index + 1] = level;
      data[index + 2] = level;
      data[index + 3] = 255;
    }
  }

  return { width, height, data };
}
