import { downloadJson } from '../shared/download.ts';
import { buildColumnFeaturesFromGray } from '../shared/featureExtraction.ts';
import { extractGrayColumns, loadImageData } from '../shared/imageCanvas.ts';
import { buildEmptyTracks, buildTimeAxis, finalizeVoiceprint } from '../shared/voiceprintSchema.ts';

function mapCentroidToF0(centroidY: number): number {
  const f0Min = 85;
  const f0Max = 500;
  const position = 1 - centroidY;

  return f0Min * (f0Max / f0Min) ** position;
}

export function mapGrayColumnsToVoiceprintV2(
  columns: number[][],
  config: { duration?: number } = {},
) {
  const duration = config.duration ?? 10;
  const time = buildTimeAxis(columns.length, duration);
  const f0 = Array.from({ length: columns.length }, () => 0);
  const tracks = buildEmptyTracks(columns.length);

  columns.forEach((column, frame) => {
    const features = buildColumnFeaturesFromGray(column);
    const activity =
      0.45 * features.colEnergy +
      0.35 * features.colContrast +
      0.2 * Math.max(...features.bandEnergy);

    if (activity < 0.06) {
      return;
    }

    f0[frame] = mapCentroidToF0(features.centroidY);

    const bandSum = features.bandEnergy.reduce((sum, value) => sum + value, 0) || 1;
    features.bandEnergy.forEach((value, index) => {
      tracks[index]!.amplitudes[frame] = activity * (value / bandSum);
    });
  });

  return finalizeVoiceprint({ duration, time, f0, tracks });
}

async function runFromSelectedImage(): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('#image-input');
  const output = document.querySelector<HTMLElement>('#output');
  const file = input?.files?.[0];

  if (!file) {
    if (output) {
      output.textContent = '请先选择一张图片。';
    }
    return;
  }

  const { imageData } = await loadImageData(file);
  const result = mapGrayColumnsToVoiceprintV2(extractGrayColumns(imageData), {
    duration: 10,
  });

  if (output) {
    output.textContent = JSON.stringify(result, null, 2);
  }

  downloadJson(file.name.replace(/\.[^.]+$/, '.v2.voiceprint.json'), result);
}

function setupPage(): void {
  const button = document.querySelector<HTMLButtonElement>('#run-button');

  button?.addEventListener('click', () => {
    void runFromSelectedImage();
  });
}

if (typeof document !== 'undefined') {
  setupPage();
}
