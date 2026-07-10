import { buildGray8PreviewPixels } from '../shared/gray8Preview.ts';
import { buildColumnFeaturesFromGray } from '../shared/featureExtraction.ts';
import { extractGrayColumns, extractRgbaColumns, loadImageData } from '../shared/imageCanvas.ts';
import { buildEmptyTracks, buildTimeAxis, finalizeVoiceprint } from '../shared/voiceprintSchema.ts';
import { downloadBlob, downloadJson } from '../shared/download.ts';
import {
  buildMotionFilename,
  buildV4BatchZipBlob,
  buildV4JsonFilename,
  buildV4State,
  type V4DebugState,
} from '../shared/v4ColorMotion.ts';

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

export type ImageVoiceprintMode = 'v1' | 'v4';

export function parseModeFromSearch(search: string): ImageVoiceprintMode {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  const mode = params.get('mode');
  return mode === 'v1' ? 'v1' : 'v4';
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
  mode: ImageVoiceprintMode;
  status: BatchStatus;
  preview?: Gray8PreviewState;
  voiceprint?: ReturnType<typeof mapGrayColumnsToVoiceprintV1>;
  jsonText?: string;
  debug?: V4DebugState;
  sampleCount?: number;
  imageHeight?: number;
  errorMessage?: string;
}

const batchLimit = 10;
const defaultConcurrency = 2;

let batchItems: BatchItem[] = [];
let currentMode: ImageVoiceprintMode = 'v4';

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

function parseFloatInput(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number.parseFloat(value ?? '');
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, parsed));
}

function getV4ConfigFromInputs(): {
  colorInfluence: number;
  motionInfluence: number;
  motionThreshold: number;
  motionSmoothingWindow: number;
  motionCompression: number;
} {
  const colorInfluenceInput = document.querySelector<HTMLInputElement>('#color-influence-input');
  const motionInfluenceInput = document.querySelector<HTMLInputElement>('#motion-influence-input');
  const motionThresholdInput = document.querySelector<HTMLInputElement>('#motion-threshold-input');
  const motionSmoothingWindowInput = document.querySelector<HTMLInputElement>(
    '#motion-smoothing-window-input',
  );
  const motionCompressionInput = document.querySelector<HTMLInputElement>('#motion-compression-input');

  return {
    colorInfluence: parseFloatInput(colorInfluenceInput?.value, 0.35, 0, 0.8),
    motionInfluence: parseFloatInput(motionInfluenceInput?.value, 0.45, 0, 2),
    motionThreshold: parseFloatInput(motionThresholdInput?.value, 0.03, 0, 1),
    motionSmoothingWindow: parseDimensionInput(motionSmoothingWindowInput?.value, 3),
    motionCompression: parseFloatInput(motionCompressionInput?.value, 0.18, 0.0001, 1),
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

  item.sampleCount = sampleCount;
  item.imageHeight = imageHeight;

  if (currentMode === 'v4') {
    const rgbaColumns = extractRgbaColumns(imageData);
    const v4Config = getV4ConfigFromInputs();
    const state = buildV4State(columns, rgbaColumns, { duration, ...v4Config });

    item.preview = state.preview;
    item.voiceprint = state.voiceprint as ReturnType<typeof mapGrayColumnsToVoiceprintV1>;
    item.jsonText = state.jsonText;
    item.debug = state.debug;
    item.status = 'done';
    item.errorMessage = undefined;
    return;
  }

  const state = buildV1PureState(columns, { duration });

  item.preview = state.preview;
  item.voiceprint = state.voiceprint;
  item.jsonText = state.jsonText;
  item.debug = undefined;
  item.status = 'done';
  item.errorMessage = undefined;
}

function createJsonPre(payload: unknown): HTMLPreElement {
  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(payload, null, 2);
  return pre;
}

function renderMotionPreview(debug: V4DebugState): HTMLElement {
  return createJsonPre({
    raw: debug.motion.raw,
    filtered: debug.motion.filtered,
  });
}

function renderColorPreview(debug: V4DebugState): HTMLElement {
  return createJsonPre({
    grayBuckets: debug.grayBuckets,
    colorProfiles: debug.colorProfiles,
  });
}

function renderDebugPanel(titleText: string, body: HTMLElement): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'debug-panel';

  const title = document.createElement('h3');
  title.textContent = titleText;

  panel.append(title, body);
  return panel;
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
      downloadDataUrl(
        buildGray8Filename(item.file.name, item.sampleCount ?? sampleCount, item.imageHeight ?? imageHeight),
        item.preview.dataUrl,
      );
    });

    const jsonButton = document.createElement('button');
    jsonButton.type = 'button';
    jsonButton.textContent = '下载 JSON';
    jsonButton.disabled = item.status !== 'done' || !item.voiceprint;
    jsonButton.addEventListener('click', () => {
      if (!item.voiceprint) return;
      if (currentMode === 'v4') {
        downloadJson(buildV4JsonFilename(item.file.name), item.voiceprint);
        return;
      }

      downloadJson(buildJsonFilename(item.file.name), item.voiceprint);
    });

    const motionButton = document.createElement('button');
    motionButton.type = 'button';
    motionButton.textContent = '下载 Motion';
    motionButton.disabled =
      currentMode !== 'v4' ||
      item.status !== 'done' ||
      !item.debug ||
      !item.sampleCount ||
      !item.imageHeight;
    motionButton.addEventListener('click', () => {
      if (
        currentMode !== 'v4' ||
        item.status !== 'done' ||
        !item.debug ||
        !item.sampleCount ||
        !item.imageHeight
      ) {
        return;
      }

      downloadJson(buildMotionFilename(item.file.name, item.sampleCount, item.imageHeight), item.debug.motion);
    });

    controls.append(grayButton, jsonButton);
    if (currentMode === 'v4') {
      controls.append(motionButton);
    }

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
    summary.textContent = 'Voiceprint JSON';
    const pre = document.createElement('pre');
    pre.textContent = item.jsonText ?? '';
    details.append(summary, pre);

    const debugGrid = document.createElement('div');
    debugGrid.className = 'batch-debug-grid';
    if (currentMode === 'v4' && item.debug) {
      debugGrid.append(
        renderDebugPanel('Motion Debug', renderMotionPreview(item.debug)),
        renderDebugPanel('Color Debug', renderColorPreview(item.debug)),
      );
    }

    if (item.errorMessage) {
      const error = document.createElement('div');
      error.className = 'batch-error';
      error.textContent = item.errorMessage;
      row.append(title, error, controls, preview, details, debugGrid);
    } else {
      row.append(title, controls, preview, details, debugGrid);
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
    downloadAllButton.textContent =
      currentMode === 'v4' ? `下载全部（ZIP，${batchItems.filter((item) => item.status === 'done').length} 项）` : '下载全部（逐个）';
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

function resetModeUi(): void {
  const modeSummary = document.querySelector<HTMLElement>('#mode-summary');
  const howItWorks = document.querySelector<HTMLElement>('#how-it-works');
  const v4Controls = document.querySelector<HTMLElement>('#v4-controls');
  const v4Button = document.querySelector<HTMLButtonElement>('#mode-v4-button');
  const v1Button = document.querySelector<HTMLButtonElement>('#mode-v1-button');

  if (v4Controls) {
    v4Controls.hidden = currentMode !== 'v4';
  }

  if (modeSummary) {
    modeSummary.textContent =
      currentMode === 'v4'
        ? '一次最多 10 张图片。输出 8 阶灰度预览、v4 voiceprint JSON（批量 ZIP）。'
        : '一次最多 10 张图片。输出 8 阶灰度预览与 v1 voiceprint JSON。';
  }

  if (howItWorks) {
    if (currentMode !== 'v4') {
      howItWorks.textContent = '';
      howItWorks.hidden = true;
    } else {
      howItWorks.hidden = false;
      howItWorks.textContent = [
        '原理速览',
        '把图片从左到右扫描：每一列（横向一个位置）当作一个时间帧。',
        '在每一列里，统计像素在不同灰度梯度上的分布，把它映射成 8 个谐波轨道（H1–H8）的能量权重。',
        '同时用这一列的灰度重心估计一个基础频率 f0。',
        '颜色：不会改写灰度骨架，而是对 8 个谐波的权重做“调音色”式的再分配。',
        '横向变化率（motion）：用来调制响度包络/颗粒感（先过滤、再平滑、再限幅），避免把边缘噪点放大成乱跳。',
      ].join('\n');
    }
  }

  v4Button?.classList.toggle('is-active', currentMode === 'v4');
  v1Button?.classList.toggle('is-active', currentMode === 'v1');
}

function setMode(nextMode: ImageVoiceprintMode): void {
  if (nextMode === currentMode) {
    return;
  }

  currentMode = nextMode;
  const url = new URL(window.location.href);
  url.searchParams.set('mode', nextMode);
  window.history.replaceState(null, '', url.toString());
  resetBatch();
  resetModeUi();
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
    mode: currentMode,
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

  if (currentMode === 'v4') {
    const zipItems = batchItems
      .filter(
        (item) =>
          item.status === 'done' &&
          item.preview &&
          item.voiceprint &&
          typeof item.sampleCount === 'number' &&
          typeof item.imageHeight === 'number',
      )
      .map((item) => ({
        fileName: item.file.name,
        previewDataUrl: item.preview!.dataUrl,
        voiceprint: item.voiceprint!,
        sampleCount: item.sampleCount!,
        imageHeight: item.imageHeight!,
      }));

    if (zipItems.length === 0) {
      return;
    }

    const zipBlob = buildV4BatchZipBlob(zipItems);
    downloadBlob('v4-color-motion-batch.zip', zipBlob);
    return;
  }

  for (const item of batchItems) {
    if (item.status !== 'done' || !item.preview || !item.voiceprint) {
      continue;
    }
    downloadDataUrl(
      buildGray8Filename(item.file.name, item.sampleCount ?? sampleCount, item.imageHeight ?? imageHeight),
      item.preview.dataUrl,
    );
    downloadJson(buildJsonFilename(item.file.name), item.voiceprint);
  }
}

function setupPage(): void {
  const input = document.querySelector<HTMLInputElement>('#image-input');
  const generateButton = document.querySelector<HTMLButtonElement>('#run-button');
  const downloadAllButton = document.querySelector<HTMLButtonElement>('#download-all-button');
  const clearButton = document.querySelector<HTMLButtonElement>('#clear-button');
  const v4Button = document.querySelector<HTMLButtonElement>('#mode-v4-button');
  const v1Button = document.querySelector<HTMLButtonElement>('#mode-v1-button');

  currentMode = parseModeFromSearch(window.location.search);
  const url = new URL(window.location.href);
  url.searchParams.set('mode', currentMode);
  window.history.replaceState(null, '', url.toString());

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

  v4Button?.addEventListener('click', () => {
    setMode('v4');
    if (input) {
      input.value = '';
    }
  });

  v1Button?.addEventListener('click', () => {
    setMode('v1');
    if (input) {
      input.value = '';
    }
  });

  resetBatch();
  resetModeUi();
}

if (typeof document !== 'undefined') {
  setupPage();
}
