import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGray8PreviewState,
  buildV1PureState,
  mapGrayColumnsToVoiceprintV1,
  runWithConcurrency,
  takeFirstWithLimit,
} from '../prototypes/image-to-voiceprint/v1-gray-8/main.ts';

test('v1 maps synthetic gray columns into a valid voiceprint', () => {
  const columns = [
    [0, 0, 0, 0],
    [0.2, 0.4, 0.8, 1],
    [1, 0.7, 0.2, 0],
  ];

  const result = mapGrayColumnsToVoiceprintV1(columns, { duration: 10 });

  assert.equal(result.sampleCount, 3);
  assert.equal(result.tracks.length, 8);
  assert.equal(result.f0[0], 0);
  assert.equal(result.tracks[0]?.amplitudes[0], 0);
  assert.ok((result.f0[1] ?? 0) >= 85);
  assert.ok((result.f0[1] ?? 0) <= 500);
});

test('v1 pure exposes gray8 preview state without depending on DOM', () => {
  const columns = [
    [0, 1],
    [1, 0.51],
  ];
  let encoded: { width: number; height: number; firstPixel: number[] } | null = null;

  const preview = buildGray8PreviewState(columns, (pixels) => {
    encoded = {
      width: pixels.width,
      height: pixels.height,
      firstPixel: Array.from(pixels.data.slice(0, 4)),
    };

    return 'data:image/png;base64,stub-preview';
  });

  assert.deepEqual(encoded, {
    width: 2,
    height: 2,
    firstPixel: [0, 0, 0, 255],
  });
  assert.equal(preview.width, 2);
  assert.equal(preview.height, 2);
  assert.equal(preview.dataUrl, 'data:image/png;base64,stub-preview');
});

test('v1 pure state returns preview and formatted json from the same columns', () => {
  const columns = [
    [0, 0.4, 1],
    [1, 0.4, 0],
  ];

  const state = buildV1PureState(columns, {
    duration: 6,
    encodePreview: () => 'data:image/png;base64,pure-state',
  });

  assert.equal(state.preview.dataUrl, 'data:image/png;base64,pure-state');
  assert.equal(state.voiceprint.sampleCount, 2);
  assert.match(state.jsonText, /"sampleCount": 2/);
  assert.match(state.jsonText, /"duration": 6/);
});

test('takeFirstWithLimit hard limits to 10 items', () => {
  const input = Array.from({ length: 12 }, (_, index) => ({ id: index }));
  const result = takeFirstWithLimit(input, 10);

  assert.equal(result.items.length, 10);
  assert.equal(result.rejectedCount, 2);
});

test('runWithConcurrency never exceeds the concurrency limit', async () => {
  const items = Array.from({ length: 7 }, (_, index) => index);
  let active = 0;
  let maxActive = 0;

  await runWithConcurrency(items, 2, async () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 10));
    active -= 1;
  });

  assert.equal(maxActive <= 2, true);
});
