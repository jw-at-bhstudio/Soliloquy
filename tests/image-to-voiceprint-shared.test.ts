import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTimeAxis,
  buildEmptyTracks,
  finalizeVoiceprint,
  validateVoiceprint,
} from '../prototypes/image-to-voiceprint/shared/voiceprintSchema.ts';
import {
  buildColumnFeaturesFromGray,
  quantizeGrayBands,
  splitBands,
} from '../prototypes/image-to-voiceprint/shared/featureExtraction.ts';
import {
  buildGray8PreviewPixels,
  quantizeGrayValueToLevel,
} from '../prototypes/image-to-voiceprint/shared/gray8Preview.ts';

test('buildTimeAxis creates a 10 second evenly spaced axis', () => {
  const time = buildTimeAxis(4, 10);

  assert.deepEqual(time, [2.5, 5, 7.5, 10]);
});

test('buildEmptyTracks creates 8 tracks with matching sample count', () => {
  const tracks = buildEmptyTracks(3);

  assert.equal(tracks.length, 8);
  assert.deepEqual(tracks[0], {
    harmonicOrder: 1,
    amplitudes: [0, 0, 0],
    averageEnergy: 0,
  });
});

test('finalizeVoiceprint computes averageEnergy, referencePeak and referenceRms', () => {
  const voiceprint = finalizeVoiceprint({
    duration: 10,
    time: [5, 10],
    f0: [120, 0],
    tracks: [
      { harmonicOrder: 1, amplitudes: [0.5, 0] },
      { harmonicOrder: 2, amplitudes: [0.25, 0] },
      { harmonicOrder: 3, amplitudes: [0, 0] },
      { harmonicOrder: 4, amplitudes: [0, 0] },
      { harmonicOrder: 5, amplitudes: [0, 0] },
      { harmonicOrder: 6, amplitudes: [0, 0] },
      { harmonicOrder: 7, amplitudes: [0, 0] },
      { harmonicOrder: 8, amplitudes: [0, 0] },
    ],
  });

  assert.equal(voiceprint.sampleCount, 2);
  assert.equal(voiceprint.tracks[0]?.averageEnergy, 0.25);
  assert.equal(voiceprint.referencePeak, 0.5);
  assert.ok((voiceprint.referenceRms ?? 0) > 0);
});

test('validateVoiceprint rejects non-zero amplitudes on silent f0 frames', () => {
  assert.throws(() =>
    validateVoiceprint({
      time: [10],
      f0: [0],
      tracks: [
        { harmonicOrder: 1, amplitudes: [0.2], averageEnergy: 0.2 },
        { harmonicOrder: 2, amplitudes: [0], averageEnergy: 0 },
        { harmonicOrder: 3, amplitudes: [0], averageEnergy: 0 },
        { harmonicOrder: 4, amplitudes: [0], averageEnergy: 0 },
        { harmonicOrder: 5, amplitudes: [0], averageEnergy: 0 },
        { harmonicOrder: 6, amplitudes: [0], averageEnergy: 0 },
        { harmonicOrder: 7, amplitudes: [0], averageEnergy: 0 },
        { harmonicOrder: 8, amplitudes: [0], averageEnergy: 0 },
      ],
      duration: 10,
      sampleCount: 1,
      referencePeak: 0.2,
      referenceRms: 0.0707,
    }),
  );
});

test('quantizeGrayBands returns 8 normalized buckets', () => {
  const buckets = quantizeGrayBands([0, 0.1, 0.2, 0.8, 0.95]);

  assert.equal(buckets.length, 8);
  assert.equal(
    buckets.reduce((sum, value) => sum + value, 0),
    1,
  );
});

test('splitBands returns 8 vertical bands for a column', () => {
  const bands = splitBands([1, 2, 3, 4, 5, 6, 7, 8], 8);

  assert.deepEqual(bands, [[1], [2], [3], [4], [5], [6], [7], [8]]);
});

test('buildColumnFeaturesFromGray calculates energy, contrast and centroid', () => {
  const features = buildColumnFeaturesFromGray([0, 0.5, 1]);

  assert.equal(features.colEnergy, 0.5);
  assert.ok(features.colContrast > 0);
  assert.ok(features.centroidY > 0.5);
});

test('quantizeGrayValueToLevel snaps normalized gray into 8 levels', () => {
  assert.equal(quantizeGrayValueToLevel(0), 0);
  assert.equal(quantizeGrayValueToLevel(0.2), 36);
  assert.equal(quantizeGrayValueToLevel(1), 255);
});

test('buildGray8PreviewPixels expands gray columns into rgba pixels', () => {
  const pixels = buildGray8PreviewPixels([
    [0, 1],
    [0.51, 0.74],
  ]);

  assert.equal(pixels.width, 2);
  assert.equal(pixels.height, 2);
  assert.equal(pixels.data.length, 16);
  assert.deepEqual(Array.from(pixels.data.slice(0, 4)), [0, 0, 0, 255]);
});
