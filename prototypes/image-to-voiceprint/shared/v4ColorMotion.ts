import { buildColumnColorFeaturesFromRgba, type ColumnColorFeatures } from './colorFeatures.ts';
import { buildColumnFeaturesFromGray } from './featureExtraction.ts';
import { buildGray8PreviewPixels } from './gray8Preview.ts';
import { clamp } from './math.ts';
import { buildMotionSeries, type MotionSeries } from './motionFeatures.ts';
import type { PixelRgba } from './imageCanvas.ts';
import type { PrototypeVoiceprintData } from './types.ts';
import { buildEmptyTracks, buildTimeAxis, finalizeVoiceprint } from './voiceprintSchema.ts';
import { createStoredZip } from './zip.ts';

export interface Gray8PreviewPixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface Gray8PreviewState {
  width: number;
  height: number;
  dataUrl: string;
}

export type Gray8PreviewEncoder = (pixels: Gray8PreviewPixels) => string;

export interface V4Config {
  duration?: number;
  colorInfluence?: number;
  colorHighHarmonicBias?: number;
  colorHueSpread?: number;
  lowHarmonicFloor?: number;
  desaturateFallback?: number;
  motionInfluence?: number;
  motionThreshold?: number;
  motionSmoothingWindow?: number;
  motionCompression?: number;
  encodePreview?: Gray8PreviewEncoder;
}

interface ResolvedV4Config {
  duration: number;
  colorInfluence: number;
  colorHighHarmonicBias: number;
  colorHueSpread: number;
  lowHarmonicFloor: number;
  desaturateFallback: number;
  motionInfluence: number;
  motionThreshold: number;
  motionSmoothingWindow: number;
  motionCompression: number;
}

export interface V4ColorProfile {
  satMean: number;
  hueCenter: number;
  hueVar: number;
  modifier: number[];
  harmonicShape: number[];
}

export interface V4DebugState {
  motion: MotionSeries;
  colorProfiles: V4ColorProfile[];
  grayBuckets: number[][];
}

export interface V4PureState {
  voiceprint: PrototypeVoiceprintData;
  preview: Gray8PreviewState;
  jsonText: string;
  debug: V4DebugState;
}

function resolveV4Config(config: V4Config = {}): ResolvedV4Config {
  return {
    duration: config.duration ?? 10,
    colorInfluence: clamp(config.colorInfluence ?? 0.35, 0, 0.8),
    colorHighHarmonicBias: clamp(config.colorHighHarmonicBias ?? 0.9, 0, 2),
    colorHueSpread: clamp(config.colorHueSpread ?? 0.45, 0, 1),
    lowHarmonicFloor: clamp(config.lowHarmonicFloor ?? 0.08, 0, 0.3),
    desaturateFallback: clamp(config.desaturateFallback ?? 0.18, 0.01, 1),
    motionInfluence: clamp(config.motionInfluence ?? 0.45, 0, 2),
    motionThreshold: clamp(config.motionThreshold ?? 0.03, 0, 1),
    motionSmoothingWindow: Math.max(1, Math.round(config.motionSmoothingWindow ?? 3)),
    motionCompression: Math.max(0.0001, config.motionCompression ?? 0.18),
  };
}

function mapCentroidToF0(centroidY: number): number {
  const f0Min = 85;
  const f0Max = 500;
  const position = 1 - clamp(centroidY);

  return f0Min * (f0Max / f0Min) ** position;
}

function normalizeDistribution(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);

  if (total <= 0) {
    const uniform = 1 / Math.max(1, values.length);
    return values.map(() => uniform);
  }

  return values.map((value) => Math.max(0, value) / total);
}

function circularDistance(a: number, b: number): number {
  const distance = Math.abs(a - b);
  return Math.min(distance, 1 - distance);
}

function getColorInfluenceScale(color: ColumnColorFeatures, config: ResolvedV4Config): number {
  if (color.satMean >= config.desaturateFallback) {
    return 1;
  }

  return color.satMean / config.desaturateFallback;
}

export function buildColorModifier(color: ColumnColorFeatures, config: ResolvedV4Config): number[] {
  const influence = config.colorInfluence * getColorInfluenceScale(color, config);

  return Array.from({ length: 8 }, (_, index) => {
    const harmonic = index + 1;
    const harmonicPosition = index / 7;
    const satTilt = 1 + config.colorHighHarmonicBias * color.satMean * harmonicPosition;
    const hueWindow = Math.max(0.25, 1 - circularDistance(harmonicPosition, color.hueCenter) * 2);
    const spreadWindow = Math.max(
      0.25,
      1 - config.colorHueSpread * color.hueVar * (Math.abs(harmonic - 4.5) / 4.5),
    );
    const modifierRaw = clamp(satTilt * hueWindow * spreadWindow, 0.35, 2);
    const blended = 1 + (modifierRaw - 1) * influence;
    const lowFloor = harmonic <= 2 ? config.lowHarmonicFloor : 0;

    return Math.max(lowFloor, blended);
  });
}

function applyColorToGrayBuckets(
  grayBuckets: number[],
  color: ColumnColorFeatures,
  config: ResolvedV4Config,
): { modifier: number[]; harmonicShape: number[] } {
  const baseShape = normalizeDistribution(grayBuckets);
  const modifier = buildColorModifier(color, config);
  const colorized = baseShape.map((value, index) => value * (modifier[index] ?? 1));

  if (colorized.every((value) => value <= 0)) {
    return {
      modifier,
      harmonicShape: baseShape,
    };
  }

  return {
    modifier,
    harmonicShape: normalizeDistribution(colorized),
  };
}

export function encodeGray8PreviewDataUrl(pixels: Gray8PreviewPixels): string {
  if (typeof document === 'undefined' || typeof ImageData === 'undefined') {
    throw new Error('gray8 preview encoding requires browser canvas APIs');
  }

  const canvas = document.createElement('canvas');
  canvas.width = pixels.width;
  canvas.height = pixels.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('2d context unavailable');
  }

  context.putImageData(new ImageData(pixels.data, pixels.width, pixels.height), 0, 0);
  return canvas.toDataURL('image/png');
}

export function buildGray8PreviewState(
  columns: number[][],
  encodePreview: Gray8PreviewEncoder = encodeGray8PreviewDataUrl,
): Gray8PreviewState {
  const pixels = buildGray8PreviewPixels(columns);

  return {
    width: pixels.width,
    height: pixels.height,
    dataUrl: encodePreview(pixels),
  };
}

function buildColorProfile(column: PixelRgba[], grayBuckets: number[], config: ResolvedV4Config): V4ColorProfile {
  const color = buildColumnColorFeaturesFromRgba(
    column.map((pixel) => [pixel.red, pixel.green, pixel.blue, pixel.alpha] as const),
  );
  const { modifier, harmonicShape } = applyColorToGrayBuckets(grayBuckets, color, config);

  return {
    satMean: color.satMean,
    hueCenter: color.hueCenter,
    hueVar: color.hueVar,
    modifier,
    harmonicShape,
  };
}

function analyzeV4Columns(
  grayColumns: number[][],
  rgbaColumns: PixelRgba[][],
  config: ResolvedV4Config,
): {
  grayFeatures: ReturnType<typeof buildColumnFeaturesFromGray>[];
  colorProfiles: V4ColorProfile[];
  motion: MotionSeries;
} {
  const grayFeatures = grayColumns.map((column) => buildColumnFeaturesFromGray(column));
  const colorProfiles = grayFeatures.map((features, index) =>
    buildColorProfile(rgbaColumns[index] ?? [], features.grayBuckets, config),
  );
  const motion = buildMotionSeries(grayFeatures, {
    smoothingWindow: config.motionSmoothingWindow,
    threshold: config.motionThreshold,
    compression: config.motionCompression,
  });

  return {
    grayFeatures,
    colorProfiles,
    motion,
  };
}

function buildVoiceprintFromAnalysis(
  analysis: ReturnType<typeof analyzeV4Columns>,
  sampleCount: number,
  config: ResolvedV4Config,
): PrototypeVoiceprintData {
  const time = buildTimeAxis(sampleCount, config.duration);
  const f0 = Array.from({ length: sampleCount }, () => 0);
  const tracks = buildEmptyTracks(sampleCount);

  analysis.grayFeatures.forEach((features, frame) => {
    const activityBase = 0.7 * features.colEnergy + 0.3 * features.colContrast;
    if (activityBase < 0.08) {
      return;
    }

    const motionModifier = 1 + config.motionInfluence * (analysis.motion.filtered[frame] ?? 0);
    const activityFinal = clamp(activityBase * motionModifier);
    const colorProfile = analysis.colorProfiles[frame];

    f0[frame] = mapCentroidToF0(features.centroidY);
    colorProfile?.harmonicShape.forEach((bucket, index) => {
      tracks[index]!.amplitudes[frame] = activityFinal * bucket;
    });
  });

  return finalizeVoiceprint({
    duration: config.duration,
    time,
    f0,
    tracks,
  });
}

export function mapColumnsToVoiceprintV4(
  grayColumns: number[][],
  rgbaColumns: PixelRgba[][],
  config: V4Config = {},
): PrototypeVoiceprintData {
  const resolved = resolveV4Config(config);
  const analysis = analyzeV4Columns(grayColumns, rgbaColumns, resolved);
  return buildVoiceprintFromAnalysis(analysis, grayColumns.length, resolved);
}

export function buildV4State(
  grayColumns: number[][],
  rgbaColumns: PixelRgba[][],
  config: V4Config = {},
): V4PureState {
  const resolved = resolveV4Config(config);
  const analysis = analyzeV4Columns(grayColumns, rgbaColumns, resolved);
  const voiceprint = buildVoiceprintFromAnalysis(analysis, grayColumns.length, resolved);
  const preview = buildGray8PreviewState(grayColumns, config.encodePreview);

  return {
    voiceprint,
    preview,
    jsonText: JSON.stringify(voiceprint, null, 2),
    debug: {
      motion: analysis.motion,
      colorProfiles: analysis.colorProfiles,
      grayBuckets: analysis.grayFeatures.map((feature) => feature.grayBuckets),
    },
  };
}

function replaceFileExtension(filename: string, nextExtension: string): string {
  return filename.replace(/\.[^.]+$/, nextExtension);
}

export function buildV4JsonFilename(filename: string): string {
  return replaceFileExtension(filename, '.v4.voiceprint.json');
}

export function buildMotionFilename(filename: string, sampleCount: number, imageHeight: number): string {
  return replaceFileExtension(filename, `.motion.${sampleCount}x${imageHeight}.json`);
}

export interface V4BatchZipItem {
  fileName: string;
  previewDataUrl: string;
  voiceprint: PrototypeVoiceprintData;
  sampleCount: number;
  imageHeight: number;
}

function buildGray8Filename(filename: string, sampleCount: number, imageHeight: number): string {
  return replaceFileExtension(filename, `.gray8.${sampleCount}x${imageHeight}.png`);
}

function decodeBase64Payload(payload: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(payload);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  return Uint8Array.from(Buffer.from(payload, 'base64'));
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const match = dataUrl.match(/^data:.*?;base64,(.+)$/);
  if (!match) {
    throw new Error('Only base64 data URLs are supported for batch zip export.');
  }

  return decodeBase64Payload(match[1]!);
}

export function buildV4BatchZipBlob(items: V4BatchZipItem[]): Blob {
  const encoder = new TextEncoder();
  const entries = items.flatMap((item) => [
    {
      name: buildGray8Filename(item.fileName, item.sampleCount, item.imageHeight),
      bytes: dataUrlToBytes(item.previewDataUrl),
    },
    {
      name: buildV4JsonFilename(item.fileName),
      bytes: encoder.encode(JSON.stringify(item.voiceprint, null, 2)),
    },
  ]);

  return createStoredZip(entries);
}

