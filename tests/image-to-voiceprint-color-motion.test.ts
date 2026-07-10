import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  buildColumnColorFeaturesFromRgba,
  rgbToHsvNormalized,
} from '../prototypes/image-to-voiceprint/shared/colorFeatures.ts';
import { extractRgbaColumns } from '../prototypes/image-to-voiceprint/shared/imageCanvas.ts';
import {
  buildMotionSeries,
  smoothSeries,
} from '../prototypes/image-to-voiceprint/shared/motionFeatures.ts';
import {
  buildV4BatchZipBlob,
  buildMotionFilename,
  buildV4JsonFilename,
  buildV4State,
  mapColumnsToVoiceprintV4,
} from '../prototypes/image-to-voiceprint/shared/v4ColorMotion.ts';

test('rgbToHsvNormalized maps vivid red to high saturation and hue near zero', () => {
  const result = rgbToHsvNormalized(255, 0, 0);

  assert.ok(result.h >= 0 && result.h <= 1);
  assert.ok(result.h < 0.01 || result.h > 0.99);
  assert.ok(result.s > 0.99);
  assert.ok(result.v > 0.99);
});

test('buildColumnColorFeaturesFromRgba returns stable satMean hueCenter and hueVar', () => {
  const rgbaColumn = [
    [255, 0, 0, 255],
    [255, 32, 32, 255],
    [240, 0, 0, 255],
    [10, 10, 10, 255],
  ] as const;

  const result = buildColumnColorFeaturesFromRgba(rgbaColumn);

  assert.ok(result.satMean > 0.6);
  assert.ok(result.hueCenter >= 0 && result.hueCenter <= 1);
  assert.ok(result.hueVar >= 0);
});

test('extractRgbaColumns returns one rgba stack per x position', () => {
  const imageData = {
    width: 2,
    height: 2,
    data: new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 255, 0, 128,
      0, 0, 255, 64,
      255, 255, 255, 0,
    ]),
  } as ImageData;

  const columns = extractRgbaColumns(imageData);

  assert.equal(columns.length, 2);
  assert.deepEqual(columns[0], [
    { red: 255, green: 0, blue: 0, alpha: 255 },
    { red: 0, green: 0, blue: 255, alpha: 64 },
  ]);
  assert.deepEqual(columns[1], [
    { red: 0, green: 255, blue: 0, alpha: 128 },
    { red: 255, green: 255, blue: 255, alpha: 0 },
  ]);
});

test('smoothSeries reduces single-frame spikes with a moving window', () => {
  const result = smoothSeries([0, 0, 1, 0, 0], 3);

  assert.ok((result[2] ?? 0) < 1);
  assert.equal(result.length, 5);
});

test('buildMotionSeries mixes bucket centroid and contrast differences', () => {
  const result = buildMotionSeries([
    { grayBuckets: [1, 0, 0, 0, 0, 0, 0, 0], centroidY: 0.2, colContrast: 0.1 },
    { grayBuckets: [0, 1, 0, 0, 0, 0, 0, 0], centroidY: 0.8, colContrast: 0.3 },
  ]);

  assert.equal(result.raw.length, 2);
  assert.ok((result.raw[1] ?? 0) > 0);
});

test('v4 keeps JSON shape compatible with v1 while changing harmonic balance', () => {
  const columns = [
    [0.1, 0.3, 0.6, 0.9],
    [0.2, 0.4, 0.7, 1.0],
  ];
  const colorColumns = [
    [
      { red: 255, green: 0, blue: 0, alpha: 255 },
      { red: 255, green: 32, blue: 32, alpha: 255 },
      { red: 220, green: 16, blue: 16, alpha: 255 },
      { red: 180, green: 0, blue: 0, alpha: 255 },
    ],
    [
      { red: 32, green: 32, blue: 255, alpha: 255 },
      { red: 48, green: 48, blue: 255, alpha: 255 },
      { red: 64, green: 64, blue: 255, alpha: 255 },
      { red: 80, green: 80, blue: 255, alpha: 255 },
    ],
  ];

  const result = mapColumnsToVoiceprintV4(columns, colorColumns, { duration: 10 });

  assert.equal(result.sampleCount, 2);
  assert.equal(result.tracks.length, 8);
  assert.equal(result.time.length, result.sampleCount);
  assert.equal(result.f0.length, result.sampleCount);
  assert.ok(result.tracks[0]!.amplitudes.some((value) => value > 0));
  assert.notDeepEqual(
    result.tracks.map((track) => track.amplitudes),
    Array.from({ length: 8 }, () => [0, 0]),
  );
});

test('buildV4State returns debug data for color and motion previews', () => {
  const columns = [
    [0.1, 0.3, 0.6, 0.9],
    [0.2, 0.4, 0.7, 1.0],
  ];
  const colorColumns = [
    [
      { red: 255, green: 0, blue: 0, alpha: 255 },
      { red: 255, green: 32, blue: 32, alpha: 255 },
      { red: 220, green: 16, blue: 16, alpha: 255 },
      { red: 180, green: 0, blue: 0, alpha: 255 },
    ],
    [
      { red: 32, green: 32, blue: 255, alpha: 255 },
      { red: 48, green: 48, blue: 255, alpha: 255 },
      { red: 64, green: 64, blue: 255, alpha: 255 },
      { red: 80, green: 80, blue: 255, alpha: 255 },
    ],
  ];

  const state = buildV4State(columns, colorColumns, {
    encodePreview: () => 'data:image/png;base64,v4',
  });

  assert.equal(state.preview.dataUrl, 'data:image/png;base64,v4');
  assert.equal(state.debug.motion.raw.length, columns.length);
  assert.equal(state.debug.motion.filtered.length, columns.length);
  assert.equal(state.debug.colorProfiles.length, columns.length);
  assert.equal(state.debug.grayBuckets.length, columns.length);
  assert.match(state.jsonText, /"tracks"/);
});

test('v4 uses a dedicated json filename suffix', () => {
  assert.equal(buildV4JsonFilename('street.png'), 'street.v4.voiceprint.json');
});

test('v4 motion debug filename includes sample geometry', () => {
  assert.equal(buildMotionFilename('street.png', 467, 256), 'street.motion.467x256.json');
});

test('v4 batch download builds one zip with gray png and v4 voiceprint json only', async () => {
  const zipBlob = buildV4BatchZipBlob([
    {
      fileName: 'street.png',
      previewDataUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=',
      voiceprint: {
        duration: 10,
        sampleCount: 1,
        time: [0],
        f0: [220],
        tracks: Array.from({ length: 8 }, (_, index) => ({
          harmonicOrder: index + 1,
          amplitudes: [index === 0 ? 1 : 0],
          averageEnergy: index === 0 ? 1 : 0,
        })),
        referenceRms: 0.125,
        referencePeak: 1,
      },
      sampleCount: 467,
      imageHeight: 256,
    },
  ]);

  assert.equal(zipBlob.type, 'application/zip');

  const zipBytes = Buffer.from(await zipBlob.arrayBuffer());
  const zipText = zipBytes.toString('latin1');

  assert.match(zipText, /street\.gray8\.467x256\.png/);
  assert.match(zipText, /street\.v4\.voiceprint\.json/);
  assert.doesNotMatch(zipText, /street\.motion\.467x256\.json/);
  assert.match(zipText, /"sampleCount":\s*1/);
  assert.equal(
    zipBytes.includes(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    true,
  );
});

test('unified image-to-voiceprint page exposes v4 runtime controls and mode switch', () => {
  const html = fs.readFileSync(
    path.join(process.cwd(), 'prototypes/image-to-voiceprint/v1-gray-8/index.html'),
    'utf8',
  );

  assert.match(html, /id="mode-v4-button"/);
  assert.match(html, /id="mode-v1-button"/);
  assert.match(html, /id="sample-count-input"/);
  assert.match(html, /id="image-height-input"/);
  assert.match(html, /id="duration-input"/);
  assert.match(html, /id="v4-controls"/);
  assert.match(html, /id="color-influence-input"/);
  assert.match(html, /id="motion-smoothing-window-input"/);
  assert.match(html, /id="motion-compression-input"/);
});

test('unified page includes the v4 how-it-works copy', () => {
  const mainTs = fs.readFileSync(
    path.join(process.cwd(), 'prototypes/image-to-voiceprint/v1-gray-8/main.ts'),
    'utf8',
  );

  assert.match(mainTs, /原理速览/);
  assert.match(mainTs, /横向变化率/);
  assert.match(mainTs, /颜色：不会改写灰度骨架/);
});

test('legacy v4 page is removed and no longer linked from the index', () => {
  const indexHtml = fs.readFileSync(
    path.join(process.cwd(), 'prototypes/image-to-voiceprint/index.html'),
    'utf8',
  );
  const v4PagePath = path.join(
    process.cwd(),
    'prototypes/image-to-voiceprint/v4-color-motion/index.html',
  );

  assert.doesNotMatch(indexHtml, /v4-color-motion/);
  assert.equal(fs.existsSync(v4PagePath), false);
});
