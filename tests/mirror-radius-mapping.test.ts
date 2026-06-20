import test from 'node:test';
import assert from 'node:assert/strict';

import type { VoiceprintTrack } from '../src/features/mirror/types';
import {
  DisplayMode,
  RadiusMode,
  SideRenderMode,
} from '../src/features/mirror/types';
import { calculateTrackPoints } from '../src/features/mirror/utils/coordinateCalculators';
import {
  computeTrackRadiusSlots,
  sanitizeFrequencyRange,
} from '../src/features/mirror/utils/radiusMapping';

function createTrack(harmonicOrder: number, amplitudes: number[]): VoiceprintTrack {
  const averageEnergy =
    amplitudes.length === 0
      ? 0
      : amplitudes.reduce((sum, value) => sum + value, 0) / amplitudes.length;

  return {
    harmonicOrder,
    amplitudes,
    averageEnergy,
  };
}

test('mirror types expose radius modes for absolute frequency and relative harmonic placement', () => {
  assert.equal(RadiusMode.ABSOLUTE_FREQUENCY, 'ABSOLUTE_FREQUENCY');
  assert.equal(RadiusMode.RELATIVE_HARMONIC, 'RELATIVE_HARMONIC');
});

test('absolute frequency mode maps tracks onto a fixed global frequency scale', () => {
  const tracks = [
    createTrack(1, [0.3, 0.5]),
    createTrack(2, [0.2, 0.2]),
    createTrack(3, [0.6, 0.7]),
  ];

  const slots = computeTrackRadiusSlots({
    tracks,
    f0: [100, 110],
    radiusMode: RadiusMode.ABSOLUTE_FREQUENCY,
    frequencyMin: 80,
    frequencyMax: 2000,
    radiusMin: 60,
    radiusMax: 200,
    energyInfluence: 0,
  });

  assert.equal(slots.length, 3);
  assert.ok(slots[1].radius > slots[0].radius);
  assert.ok(slots[2].radius > slots[1].radius);
  assert.equal(Math.round(slots[0].representativeFrequency), 105);
  assert.equal(Math.round(slots[2].representativeFrequency), 315);
});

test('absolute frequency mode clamps out-of-range tracks to the configured radius bounds', () => {
  const lowSlots = computeTrackRadiusSlots({
    tracks: [createTrack(1, [0.1])],
    f0: [10, 10],
    radiusMode: RadiusMode.ABSOLUTE_FREQUENCY,
    frequencyMin: 80,
    frequencyMax: 2000,
    radiusMin: 60,
    radiusMax: 200,
    energyInfluence: 0,
  });

  assert.equal(lowSlots[0].radius, 60);

  const highSlots = computeTrackRadiusSlots({
    tracks: [createTrack(40, [0.2])],
    f0: [100],
    radiusMode: RadiusMode.ABSOLUTE_FREQUENCY,
    frequencyMin: 80,
    frequencyMax: 2000,
    radiusMin: 60,
    radiusMax: 200,
    energyInfluence: 0,
  });

  assert.equal(highSlots[0].radius, 200);
});

test('relative harmonic mode keeps harmonic slots stable independent of energy ranking', () => {
  const tracks = [
    createTrack(1, [0.3, 0.5]),
    createTrack(2, [0.2, 0.2]),
    createTrack(4, [0.6, 0.7]),
  ];

  const slots = computeTrackRadiusSlots({
    tracks,
    f0: [100, 110],
    radiusMode: RadiusMode.RELATIVE_HARMONIC,
    frequencyMin: 80,
    frequencyMax: 2000,
    radiusMin: 60,
    radiusMax: 180,
    energyInfluence: 0,
  });

  assert.deepEqual(
    slots.map((slot) => slot.slotIndex),
    [0, 1, 3],
  );
  assert.deepEqual(
    slots.map((slot) => slot.radius),
    [60, 100, 180],
  );
});

test('100 percent amplitude mapping uses continuous average-amplitude distances instead of equal rank spacing', () => {
  const tracks = [
    createTrack(1, [0.1, 0.1]),
    createTrack(2, [0.11, 0.11]),
    createTrack(3, [1.0, 1.0]),
  ];

  const slots = computeTrackRadiusSlots({
    tracks,
    f0: [100, 100],
    radiusMode: RadiusMode.ABSOLUTE_FREQUENCY,
    frequencyMin: 80,
    frequencyMax: 2000,
    radiusMin: 50,
    radiusMax: 170,
    energyInfluence: 1,
  });

  assert.equal(slots[0].radius, 50);
  assert.ok(Math.abs(slots[1].radius - 51.33333333333333) < 1e-6);
  assert.equal(slots[2].radius, 170);
  assert.ok(slots[1].radius - slots[0].radius < 3);
  assert.ok(slots[2].radius - slots[1].radius > 100);
});

test('invalid frequency ranges are sanitized into a legal ascending interval', () => {
  assert.deepEqual(sanitizeFrequencyRange(-10, -10), { frequencyMin: 80, frequencyMax: 2000 });
  assert.deepEqual(sanitizeFrequencyRange(500, 500), { frequencyMin: 500, frequencyMax: 501 });
  assert.deepEqual(sanitizeFrequencyRange(500, 100), { frequencyMin: 500, frequencyMax: 501 });
});

test('track points keep outer-slot geometry when the middle track is not selected', () => {
  const tracks = [
    createTrack(1, [0.1, 0.1]),
    createTrack(2, [0.1, 0.1]),
    createTrack(3, [0.1, 0.1]),
  ];

  const data = {
    time: [0, 1],
    f0: [100, 100],
    tracks,
    duration: 1,
    sampleCount: 2,
  };

  const config = {
    displayMode: DisplayMode.ENVELOPE,
    leftTrackIndices: [0, 2],
    rightTrackIndices: [0, 2],
    leftRenderMode: SideRenderMode.SEPARATE,
    rightRenderMode: SideRenderMode.SEPARATE,
    radiusMode: RadiusMode.RELATIVE_HARMONIC,
    frequencyMin: 80,
    frequencyMax: 2000,
    radiusMin: 60,
    radiusMax: 180,
    energyInfluence: 0,
    amplitudeScale: 0,
    waveDensityMultiplier: 1,
    showGrid: false,
  };

  const points = calculateTrackPoints(data, tracks, config, new Float32Array([0, 1]), 0, 0);

  assert.equal(points.length, 2);
  assert.ok(Math.abs(points[0].leftPoints[0].y - 60) < 1e-6);
  assert.ok(Math.abs(points[1].leftPoints[0].y - 180) < 1e-6);
});
