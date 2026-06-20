import test from 'node:test';
import assert from 'node:assert/strict';

import { DisplayMode, SideRenderMode } from '../src/features/mirror/types';
import {
  createDefaultTrackSelection,
  resolveTrackRenderSeries,
  sanitizeTrackSelection,
} from '../src/features/mirror/utils/trackSelection';
import type { VoiceprintTrack } from '../src/features/mirror/types';

function createTrack(order: number, amplitudes: number[]): VoiceprintTrack {
  const averageEnergy = amplitudes.reduce((sum, value) => sum + value, 0) / amplitudes.length;
  return {
    harmonicOrder: order,
    amplitudes,
    averageEnergy,
  };
}

test('default track selection never exceeds available tracks', () => {
  assert.deepEqual(createDefaultTrackSelection(6, 12), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(createDefaultTrackSelection(0, 12), []);
});

test('track selection keeps explicit valid indices and removes duplicates', () => {
  assert.deepEqual(sanitizeTrackSelection([5, 2, 2, 9, -1, 1], 6), [1, 2, 5]);
});

test('separate render mode respects explicitly selected tracks instead of taking the first N tracks', () => {
  const tracks = [
    createTrack(1, [0.1, 0.2]),
    createTrack(2, [0.2, 0.3]),
    createTrack(3, [0.3, 0.4]),
    createTrack(4, [0.4, 0.5]),
  ];

  const series = resolveTrackRenderSeries(tracks, [0, 2], SideRenderMode.SEPARATE);

  assert.equal(series.length, 2);
  assert.equal(series[0].harmonicOrder, 1);
  assert.equal(series[1].harmonicOrder, 3);
});

test('separate render mode preserves precomputed stable slot radii when middle tracks are hidden', () => {
  const tracks = [
    createTrack(1, [0.1, 0.2]),
    createTrack(2, [0.2, 0.3]),
    createTrack(3, [0.3, 0.4]),
  ];

  const slots = [
    { trackIndex: 0, harmonicOrder: 1, averageEnergy: 0.15, representativeFrequency: 100, slotIndex: 0, frequencyRadius: 60, energyRadius: 60, radius: 60 },
    { trackIndex: 1, harmonicOrder: 2, averageEnergy: 0.25, representativeFrequency: 200, slotIndex: 1, frequencyRadius: 120, energyRadius: 120, radius: 120 },
    { trackIndex: 2, harmonicOrder: 3, averageEnergy: 0.35, representativeFrequency: 300, slotIndex: 2, frequencyRadius: 180, energyRadius: 180, radius: 180 },
  ];

  const series = resolveTrackRenderSeries(tracks, [0, 2], SideRenderMode.SEPARATE, slots);

  assert.equal(series.length, 2);
  assert.equal(series[0].radius, 60);
  assert.equal(series[1].radius, 180);
});

test('merged render mode sums the selected tracks into one drawable series', () => {
  const tracks = [
    createTrack(1, [0.1, 0.2]),
    createTrack(2, [0.2, 0.3]),
    createTrack(3, [0.3, 0.4]),
  ];

  const slots = [
    { trackIndex: 0, harmonicOrder: 1, averageEnergy: 0.15, representativeFrequency: 100, slotIndex: 0, frequencyRadius: 60, energyRadius: 70, radius: 65 },
    { trackIndex: 1, harmonicOrder: 2, averageEnergy: 0.25, representativeFrequency: 200, slotIndex: 1, frequencyRadius: 120, energyRadius: 120, radius: 120 },
    { trackIndex: 2, harmonicOrder: 3, averageEnergy: 0.35, representativeFrequency: 300, slotIndex: 2, frequencyRadius: 180, energyRadius: 170, radius: 175 },
  ];

  const merged = resolveTrackRenderSeries(tracks, [0, 2], SideRenderMode.MERGED, slots);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].harmonicOrder, 1);
  assert.deepEqual(merged[0].amplitudes, [0.4, 0.6000000000000001]);
  assert.ok((merged[0].radius ?? 0) > 140);
});

test('mirror types expose the new side render mode for explicit per-side drawing control', () => {
  assert.equal(DisplayMode.ENVELOPE, 'ENVELOPE');
  assert.equal(SideRenderMode.SEPARATE, 'SEPARATE');
  assert.equal(SideRenderMode.MERGED, 'MERGED');
});
