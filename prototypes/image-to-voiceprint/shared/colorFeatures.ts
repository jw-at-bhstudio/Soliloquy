export interface ColumnColorFeatures {
  satMean: number;
  hueCenter: number;
  hueVar: number;
}

export interface HsvNormalized {
  h: number;
  s: number;
  v: number;
}

export function rgbToHsvNormalized(red: number, green: number, blue: number): HsvNormalized {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue = 0;
  if (delta > 0) {
    if (max === r) {
      hue = ((g - b) / delta) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
  }

  return {
    h: ((hue * 60 + 360) % 360) / 360,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

export function buildColumnColorFeaturesFromRgba(
  rgbaColumn: ReadonlyArray<readonly [number, number, number, number]>,
): ColumnColorFeatures {
  const hsvValues = rgbaColumn.map(([red, green, blue]) => rgbToHsvNormalized(red, green, blue));
  const count = Math.max(1, hsvValues.length);
  const satMean = hsvValues.reduce((sum, value) => sum + value.s, 0) / count;
  const hueX = hsvValues.reduce((sum, value) => sum + Math.cos(value.h * Math.PI * 2), 0);
  const hueY = hsvValues.reduce((sum, value) => sum + Math.sin(value.h * Math.PI * 2), 0);
  const hueCenter = (Math.atan2(hueY, hueX) / (Math.PI * 2) + 1) % 1;
  const hueMagnitude = Math.sqrt(hueX * hueX + hueY * hueY) / count;

  return {
    satMean,
    hueCenter,
    hueVar: 1 - hueMagnitude,
  };
}
