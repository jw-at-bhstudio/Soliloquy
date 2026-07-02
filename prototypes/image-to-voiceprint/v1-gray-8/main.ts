import { buildGray8PreviewPixels } from '../shared/gray8Preview.ts';
import { buildColumnFeaturesFromGray } from '../shared/featureExtraction.ts';
import { extractGrayColumns, loadImageData } from '../shared/imageCanvas.ts';
import { buildEmptyTracks, buildTimeAxis, finalizeVoiceprint } from '../shared/voiceprintSchema.ts';
import { downloadJson } from '../shared/download.ts';

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

export interface V1PureState {
  voiceprint: ReturnType<typeof mapGrayColumnsToVoiceprintV1>;
  preview: Gray8PreviewState;
  jsonText: string;
}

export type Gray8PreviewEncoder = (pixels: Gray8PreviewPixels) => string;

export function takeFirstWithLimit<T>(
  items: T[],
  limit: number,
): { items: T[]; rejectedCount: number } {
  if (items.length <= limit) {
    return { items, rejectedCount: 0 };
  }

  return {
    items: items.slice(0, limit),
    rejectedCount: items.length - limit,
  };
}

export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  const limit = Math.max(1, Math.floor(concurrency));
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) {
        return;
      }
      await worker(items[current]!, current);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runNext()));
}

function mapCentroidToF0(centroidY: number): number {
  const f0Min = 85;
  const f0Max = 500;
  const position = 1 - centroidY;

  return f0Min * (f0Max / f0Min) ** position;
}

export function mapGrayColumnsToVoiceprintV1(
  columns: number[][],
  config: { duration?: number } = {},
) {
  const duration = config.duration ?? 10;
  const time = buildTimeAxis(columns.length, duration);
  const f0 = Array.from({ length: columns.length }, () => 0);
  const tracks = buildEmptyTracks(columns.length);

  columns.forEach((column, frame) => {
    const features = buildColumnFeaturesFromGray(column);
    const activity = 0.7 * features.colEnergy + 0.3 * features.colContrast;

    if (activity < 0.08) {
      return;
    }

    f0[frame] = mapCentroidToF0(features.centroidY);

    features.grayBuckets.forEach((bucket, index) => {
      tracks[index]!.amplitudes[frame] = activity * bucket;
    });
  });

  return finalizeVoiceprint({ duration, time, f0, tracks });
}

export function encodeGray8PreviewDataUrl(pixels: Gray8PreviewPixels): string {
  if (
    typeof document === 'undefined' ||
    typeof ImageData === 'undefined'
  ) {
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

export function buildV1PureState(
  columns: number[][],
  config: {
    duration?: number;
    encodePreview?: Gray8PreviewEncoder;
  } = {},
): V1PureState {
  const voiceprint = mapGrayColumnsToVoiceprintV1(columns, {
    duration: config.duration,
  });
  const preview = buildGray8PreviewState(columns, config.encodePreview);

  return {
    voiceprint,
    preview,
    jsonText: JSON.stringify(voiceprint, null, 2),
  };
}

function parseDimensionInput(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(parsed) || parsed < 8) {
    return fallback;
  }

  return parsed;
}

function replaceFileExtension(filename: string, nextExtension: string): string {
  return filename.replace(/\.[^.]+$/, nextExtension);
}

function downloadDataUrl(filename: string, dataUrl: string): void {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

function clearPreview(previewImage: HTMLImageElement | null): void {
  if (!previewImage) {
    return;
  }

  previewImage.removeAttribute('src');
  previewImage.hidden = true;
}

type BatchStatus = 'idle' | 'processing' | 'done' | 'error';

interface BatchItem {
  id: string;
  file: File;
  status: BatchStatus;
  preview?: Gray8PreviewState;
  voiceprint?: ReturnType<typeof mapGrayColumnsToVoiceprintV1>;
  jsonText?: string;
  errorMessage?: string;
}

const batchLimit = 10;
const defaultConcurrency = 2;

let batchItems: BatchItem[] = [];

function formatNowId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setStatusText(text: string): void {
  const output = document.querySelector<HTMLElement>('#output');
  if (output) {
    output.textContent = text;
  }
}

function getConfigFromInputs(): {
  sampleCount: number;
  imageHeight: number;
  duration: number;
} {
  const sampleCountInput = document.querySelector<HTMLInputElement>('#sample-count-input');
  const imageHeightInput = document.querySelector<HTMLInputElement>('#image-height-input');
  const durationInput = document.querySelector<HTMLInputElement>('#duration-input');

  return {
    sampleCount: parseDimensionInput(sampleCountInput?.value, 467),
    imageHeight: parseDimensionInput(imageHeightInput?.value, 256),
    duration: parseDimensionInput(durationInput?.value, 10),
  };
}

function buildGray8Filename(filename: string, sampleCount: number, imageHeight: number): string {
  return replaceFileExtension(filename, `.gray8.${sampleCount}x${imageHeight}.png`);
}

function buildJsonFilename(filename: string): string {
  return replaceFileExtension(filename, '.v1.voiceprint.json');
}

async function processItem(item: BatchItem): Promise<void> {
  const { sampleCount, imageHeight, duration } = getConfigFromInputs();
  const { imageData } = await loadImageData(item.file, sampleCount, imageHeight);
  const columns = extractGrayColumns(imageData);
  const state = buildV1PureState(columns, { duration });

  item.preview = state.preview;
  item.voiceprint = state.voiceprint;
  item.jsonText = state.jsonText;
  item.status = 'done';
  item.errorMessage = undefined;
}

function renderBatchList(): void {
  const container = document.querySelector<HTMLElement>('#batch-list');
  if (!container) {
    return;
  }

  container.innerHTML = '';

  for (const item of batchItems) {
    const row = document.createElement('div');
    row.className = 'batch-item';

    const title = document.createElement('div');
    title.className = 'batch-title';
    title.textContent = `${item.file.name} · ${item.status}`;

    const controls = document.createElement('div');
    controls.className = 'batch-controls';

    const grayButton = document.createElement('button');
    grayButton.type = 'button';
    grayButton.textContent = '下载灰阶图';
    grayButton.disabled = item.status !== 'done' || !item.preview;
    grayButton.addEventListener('click', () => {
      const { sampleCount, imageHeight } = getConfigFromInputs();
      if (!item.preview) return;
      downloadDataUrl(buildGray8Filename(item.file.name, sampleCount, imageHeight), item.preview.dataUrl);
    });

    const jsonButton = document.createElement('button');
    jsonButton.type = 'button';
    jsonButton.textContent = '下载 JSON';
    jsonButton.disabled = item.status !== 'done' || !item.voiceprint;
    jsonButton.addEventListener('click', () => {
      if (!item.voiceprint) return;
      downloadJson(buildJsonFilename(item.file.name), item.voiceprint);
    });

    controls.append(grayButton, jsonButton);

    const preview = document.createElement('img');
    preview.className = 'batch-preview';
    preview.alt = '8阶灰度预览';
    if (item.preview?.dataUrl) {
      preview.src = item.preview.dataUrl;
      preview.hidden = false;
    } else {
      preview.hidden = true;
    }

    const details = document.createElement('details');
    details.className = 'batch-details';
    const summary = document.createElement('summary');
    summary.textContent = 'JSON';
    const pre = document.createElement('pre');
    pre.textContent = item.jsonText ?? '';
    details.append(summary, pre);

    if (item.errorMessage) {
      const error = document.createElement('div');
      error.className = 'batch-error';
      error.textContent = item.errorMessage;
      row.append(title, error, controls, preview, details);
    } else {
      row.append(title, controls, preview, details);
    }

    container.append(row);
  }
}

function setButtonsEnabled(): void {
  const generateButton = document.querySelector<HTMLButtonElement>('#run-button');
  const downloadAllButton = document.querySelector<HTMLButtonElement>('#download-all-button');
  const clearButton = document.querySelector<HTMLButtonElement>('#clear-button');

  const hasItems = batchItems.length > 0;
  const hasDone = batchItems.some((item) => item.status === 'done');
  const hasProcessing = batchItems.some((item) => item.status === 'processing');

  if (generateButton) {
    generateButton.disabled = !hasItems || hasProcessing;
  }
  if (downloadAllButton) {
    downloadAllButton.disabled = !hasDone || hasProcessing;
  }
  if (clearButton) {
    clearButton.disabled = !hasItems || hasProcessing;
  }
}

function resetBatch(): void {
  batchItems = [];
  setStatusText('');
  renderBatchList();
  setButtonsEnabled();
}

function onFilesSelected(files: FileList | null): void {
  if (!files || files.length === 0) {
    resetBatch();
    return;
  }

  const list = Array.from(files);
  if (list.length > batchLimit) {
    const input = document.querySelector<HTMLInputElement>('#image-input');
    if (input) {
      input.value = '';
    }
    setStatusText(`一次最多选择 ${batchLimit} 张图片。`);
    resetBatch();
    return;
  }

  batchItems = list.map((file) => ({
    id: formatNowId(),
    file,
    status: 'idle',
  }));
  setStatusText(`${batchItems.length} 张图片已加入队列。`);
  renderBatchList();
  setButtonsEnabled();
}

async function generateAll(): Promise<void> {
  if (batchItems.length === 0) {
    return;
  }

  for (const item of batchItems) {
    if (item.status === 'processing') {
      return;
    }
  }

  const targets = batchItems.filter((item) => item.status === 'idle' || item.status === 'error');
  if (targets.length === 0) {
    return;
  }

  setStatusText('处理中...');
  renderBatchList();
  setButtonsEnabled();

  await runWithConcurrency(targets, defaultConcurrency, async (item) => {
    item.status = 'processing';
    item.errorMessage = undefined;
    renderBatchList();
    setButtonsEnabled();

    try {
      await processItem(item);
    } catch (error) {
      item.status = 'error';
      item.errorMessage = error instanceof Error ? error.message : String(error);
    }

    renderBatchList();
    setButtonsEnabled();
  });

  setStatusText('完成。');
}

function downloadAll(): void {
  const { sampleCount, imageHeight } = getConfigFromInputs();
  for (const item of batchItems) {
    if (item.status !== 'done' || !item.preview || !item.voiceprint) {
      continue;
    }
    downloadDataUrl(buildGray8Filename(item.file.name, sampleCount, imageHeight), item.preview.dataUrl);
    downloadJson(buildJsonFilename(item.file.name), item.voiceprint);
  }
}

function setupPage(): void {
  const input = document.querySelector<HTMLInputElement>('#image-input');
  const generateButton = document.querySelector<HTMLButtonElement>('#run-button');
  const downloadAllButton = document.querySelector<HTMLButtonElement>('#download-all-button');
  const clearButton = document.querySelector<HTMLButtonElement>('#clear-button');

  input?.addEventListener('change', () => {
    onFilesSelected(input.files);
  });

  generateButton?.addEventListener('click', () => {
    void generateAll();
  });

  downloadAllButton?.addEventListener('click', () => {
    downloadAll();
  });

  clearButton?.addEventListener('click', () => {
    if (input) {
      input.value = '';
    }
    resetBatch();
  });

  resetBatch();
}

if (typeof document !== 'undefined') {
  setupPage();
}
