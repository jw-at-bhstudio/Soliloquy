import { downloadJson } from '../shared/download.ts';
import { extractGrayColumns, loadImageData } from '../shared/imageCanvas.ts';
import { mean } from '../shared/math.ts';
import { finalizeVoiceprint } from '../shared/voiceprintSchema.ts';
import { mapGrayColumnsToVoiceprintV2 } from '../v2-column-scan/main.ts';

function meanAbsoluteDeviation(values: number[]): number {
  const average = mean(values);

  return mean(values.map((value) => Math.abs(value - average)));
}

export function mapGrayColumnsToVoiceprintV3(
  columns: number[][],
  config: { duration?: number } = {},
) {
  const base = mapGrayColumnsToVoiceprintV2(columns, config);
  const columnMeans = columns.map((column) => mean(column));
  const globalBrightness = mean(columnMeans);
  const globalContrast = mean(columns.map((column) => meanAbsoluteDeviation(column)));
  const pitchBias = 0.9 + globalBrightness * 0.2;
  const harmonicTilt = Array.from(
    { length: base.tracks.length },
    (_, index) => 1 + globalContrast * (index / 14),
  );

  const tracks = base.tracks.map((track, trackIndex) => ({
    harmonicOrder: track.harmonicOrder,
    amplitudes: track.amplitudes.map((value, frame) => {
      const envelope = 0.75 + (columnMeans[frame] ?? 0) * 0.5;
      return Math.min(1, value * (harmonicTilt[trackIndex] ?? 1) * envelope);
    }),
  }));

  const f0 = base.f0.map((value) => (value === 0 ? 0 : value * pitchBias));

  return finalizeVoiceprint({
    duration: base.duration,
    time: base.time,
    f0,
    tracks,
  });
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
  const result = mapGrayColumnsToVoiceprintV3(extractGrayColumns(imageData), {
    duration: 10,
  });

  if (output) {
    output.textContent = JSON.stringify(result, null, 2);
  }

  downloadJson(file.name.replace(/\.[^.]+$/, '.v3.voiceprint.json'), result);
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
