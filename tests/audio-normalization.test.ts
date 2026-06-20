import test from 'node:test';
import assert from 'node:assert/strict';

import { synthesizeAdditiveSynthesizer } from '../src/features/analyzer/utils/dsp';
import type { AnalyzedAudio } from '../src/features/analyzer/types';

function calculateRms(samples: Float32Array): number {
  if (samples.length === 0) {
    return 0;
  }

  let sum = 0;
  for (const sample of samples) {
    sum += sample * sample;
  }
  return Math.sqrt(sum / samples.length);
}

function createConstantAnalysis(trackCount: number): AnalyzedAudio {
  const frameCount = 4;
  const harmonics = Array.from({ length: trackCount }, (_, index) => ({
    index,
    multiplier: index + 1,
    amplitudes: new Array(frameCount).fill(0.2),
    frequencies: new Array(frameCount).fill(120 * (index + 1)),
  }));

  return {
    name: 'fixture.wav',
    duration: 0.2,
    sampleRate: 4000,
    frameCount,
    f0: new Array(frameCount).fill(120),
    harmonics,
    times: [0, 0.066, 0.133, 0.2],
    audioData: new Float32Array(800).fill(0.1),
    rms: new Array(frameCount).fill(0.1),
  };
}

test('synthesized playback keeps comparable RMS when more tracks are enabled', () => {
  const analysis = createConstantAnalysis(4);

  const singleTrack = synthesizeAdditiveSynthesizer(analysis, [true, false, false, false], {
    sampleRate: analysis.sampleRate,
    targetRms: 0.12,
  });
  const allTracks = synthesizeAdditiveSynthesizer(analysis, [true, true, true, true], {
    sampleRate: analysis.sampleRate,
    targetRms: 0.12,
  });

  const singleTrackRms = calculateRms(singleTrack);
  const allTracksRms = calculateRms(allTracks);

  assert.ok(Math.abs(singleTrackRms - 0.12) < 0.02);
  assert.ok(Math.abs(allTracksRms - 0.12) < 0.02);
  assert.ok(Math.abs(singleTrackRms - allTracksRms) < 0.02);
});

test('synthesized playback stays inside peak headroom after normalization', () => {
  const analysis = createConstantAnalysis(6);

  const synthesized = synthesizeAdditiveSynthesizer(
    analysis,
    [true, true, true, true, true, true],
    {
      sampleRate: analysis.sampleRate,
      targetRms: 0.2,
    },
  );

  const peak = synthesized.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  assert.ok(peak <= 0.98);
});
