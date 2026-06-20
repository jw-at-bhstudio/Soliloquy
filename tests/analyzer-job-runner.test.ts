import test from 'node:test';
import assert from 'node:assert/strict';

import { createAnalyzerJobRunner } from '../src/features/analyzer/utils/analyzerJobRunner';
import { AnalyzerJob } from '../src/app/providers/AnalyzerRepositoryProvider';
import { AnalyzedAudio } from '../src/features/analyzer/types';

function createFakeTimers() {
  const scheduled: Array<{ id: number; fn: () => void }> = [];
  let nextId = 1;

  return {
    timers: {
      setTimeout: (fn: () => void, _timeoutMs: number) => {
        const id = nextId++;
        scheduled.push({ id, fn });
        return id;
      },
      clearTimeout: (id: number) => {
        const index = scheduled.findIndex((entry) => entry.id === id);
        if (index >= 0) {
          scheduled.splice(index, 1);
        }
      },
    },
    runAll: () => {
      const snapshot = scheduled.splice(0, scheduled.length);
      snapshot.forEach((entry) => entry.fn());
    },
    size: () => scheduled.length,
  };
}

function createJob(overrides: Partial<AnalyzerJob> = {}): AnalyzerJob {
  return {
    id: 'job_1',
    sourceName: 'sample.wav',
    sourceType: 'mic',
    createdAt: new Date().toISOString(),
    status: 'queued',
    rawAudio: new Float32Array([0, 0.1, -0.1]),
    sampleRate: 48000,
    selectedTracks: [],
    ...overrides,
  };
}

function createAnalysis(): AnalyzedAudio {
  return {
    name: 'sample.wav',
    duration: 0.01,
    sampleRate: 48000,
    frameCount: 1,
    f0: [220],
    times: [0],
    rms: [0.5],
    audioData: new Float32Array([0, 0.1, -0.1]),
    harmonics: [
      { index: 0, multiplier: 1, amplitudes: [0.2], frequencies: [220] },
      { index: 1, multiplier: 2, amplitudes: [0.1], frequencies: [440] },
    ],
  };
}

test('cancel before timer fires restores job state and clears loading', () => {
  const job = createJob();
  let current = job;
  let isLoading = false;
  const fake = createFakeTimers();

  const runner = createAnalyzerJobRunner({
    timers: fake.timers,
    updateJob: (id, updater) => {
      assert.equal(id, current.id);
      current = updater(current);
    },
    setIsLoading: (value) => {
      isLoading = value;
    },
    analyze: () => createAnalysis(),
  });

  runner.start(job, { numHarmonics: 5 });
  assert.equal(current.status, 'processing');
  assert.equal(isLoading, true);
  assert.equal(fake.size(), 1);

  runner.cancel();
  assert.equal(current.status, 'queued');
  assert.equal(isLoading, false);
  assert.equal(fake.size(), 0);
});

test('successful run updates job to ready and clears loading', () => {
  const job = createJob();
  let current = job;
  let isLoading = false;
  const fake = createFakeTimers();

  const runner = createAnalyzerJobRunner({
    timers: fake.timers,
    updateJob: (id, updater) => {
      assert.equal(id, current.id);
      current = updater(current);
    },
    setIsLoading: (value) => {
      isLoading = value;
    },
    analyze: () => createAnalysis(),
  });

  runner.start(job, { numHarmonics: 5 });
  fake.runAll();

  assert.equal(current.status, 'ready');
  assert.equal(isLoading, false);
  assert.ok(current.analysis);
  assert.ok(current.voiceprint);
  assert.deepEqual(current.selectedTracks, [true, true]);
});

test('failed run updates job to error and clears loading', () => {
  const job = createJob();
  let current = job;
  let isLoading = false;
  const fake = createFakeTimers();

  const runner = createAnalyzerJobRunner({
    timers: fake.timers,
    updateJob: (id, updater) => {
      assert.equal(id, current.id);
      current = updater(current);
    },
    setIsLoading: (value) => {
      isLoading = value;
    },
    analyze: () => {
      throw new Error('boom');
    },
  });

  runner.start(job, { numHarmonics: 5 });
  fake.runAll();

  assert.equal(current.status, 'error');
  assert.equal(current.error, 'boom');
  assert.equal(isLoading, false);
});

test('default timers keep host binding and do not crash with illegal invocation', () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const job = createJob();
  let current = job;
  let isLoading = false;
  const scheduled: Array<() => void> = [];

  globalThis.setTimeout = function (this: typeof globalThis, fn: () => void) {
    if (this !== globalThis) {
      throw new TypeError('Illegal invocation');
    }
    scheduled.push(fn);
    return 1 as any;
  } as typeof globalThis.setTimeout;

  globalThis.clearTimeout = function (this: typeof globalThis, _id?: any) {
    if (this !== globalThis) {
      throw new TypeError('Illegal invocation');
    }
  } as typeof globalThis.clearTimeout;

  try {
    const runner = createAnalyzerJobRunner({
      updateJob: (id, updater) => {
        assert.equal(id, current.id);
        current = updater(current);
      },
      setIsLoading: (value) => {
        isLoading = value;
      },
      analyze: () => createAnalysis(),
    });

    assert.doesNotThrow(() => runner.start(job, { numHarmonics: 5 }));
    assert.equal(scheduled.length, 1);

    scheduled[0]();

    assert.equal(current.status, 'ready');
    assert.equal(isLoading, false);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});
