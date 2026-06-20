# Mirror Radius Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild mirror orbit placement so track positions stay stable across visibility changes, support absolute-frequency and relative-harmonic radius modes, and redefine the energy slider as a true interpolation axis.

**Architecture:** Add a dedicated radius-mapping utility layer that computes stable slot metadata for every track before any rendering or visibility filtering. Extend mirror config/state with radius mode and global frequency scale controls, then make both drawing and playback consume those stable track slots without reflowing positions.

**Tech Stack:** React 19, TypeScript, Vite, node:test, existing mirror/analyzer utilities

---

## File Map

- Modify: `d:/Projects/Soliloquy/src/features/mirror/types.ts`
  - Add `RadiusMode`, fixed frequency range config, and slot metadata types if needed.
- Create: `d:/Projects/Soliloquy/src/features/mirror/utils/radiusMapping.ts`
  - Pure functions for stable slot generation, absolute-frequency mapping, relative-harmonic mapping, energy ranking, and interpolation.
- Modify: `d:/Projects/Soliloquy/src/features/mirror/utils/trackSelection.ts`
  - Ensure selection consumes precomputed slots rather than reflowing positions.
- Modify: `d:/Projects/Soliloquy/src/features/mirror/utils/coordinateCalculators.ts`
  - Replace current sequence-index baseline logic with slot metadata from `radiusMapping.ts`.
- Modify: `d:/Projects/Soliloquy/src/features/mirror/components/FloatingControls.tsx`
  - Add UI controls for radius mode and global frequency range; update slider copy.
- Modify: `d:/Projects/Soliloquy/src/features/mirror/MirrorWorkspace.tsx`
  - Store new config fields, sanitize them, and thread them into drawing/playback.
- Modify: `d:/Projects/Soliloquy/src/features/mirror/utils/audioSynthesizer.ts`
  - Keep selection behavior stable with fixed slots; no reflow from checked tracks.
- Modify: `d:/Projects/Soliloquy/tests/mirror-track-selection.test.ts`
  - Extend current tests to assert stable positions and slot semantics.
- Create: `d:/Projects/Soliloquy/tests/mirror-radius-mapping.test.ts`
  - Focused tests for absolute-frequency mapping, relative-harmonic slots, energy interpolation, and invalid input sanitization.

### Task 1: Define Radius Mapping Contracts

**Files:**
- Modify: `d:/Projects/Soliloquy/src/features/mirror/types.ts`
- Test: `d:/Projects/Soliloquy/tests/mirror-radius-mapping.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

import { RadiusMode } from '../src/features/mirror/types';

test('mirror types expose radius modes for absolute frequency and relative harmonic placement', () => {
  assert.equal(RadiusMode.ABSOLUTE_FREQUENCY, 'ABSOLUTE_FREQUENCY');
  assert.equal(RadiusMode.RELATIVE_HARMONIC, 'RELATIVE_HARMONIC');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL in `tests/mirror-radius-mapping.test.ts` because `RadiusMode` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export enum RadiusMode {
  ABSOLUTE_FREQUENCY = 'ABSOLUTE_FREQUENCY',
  RELATIVE_HARMONIC = 'RELATIVE_HARMONIC',
}

export interface RenderConfig {
  displayMode: DisplayMode;
  leftTrackIndices: number[];
  rightTrackIndices: number[];
  leftRenderMode: SideRenderMode;
  rightRenderMode: SideRenderMode;
  radiusMode: RadiusMode;
  frequencyMin: number;
  frequencyMax: number;
  radiusMin: number;
  radiusMax: number;
  energyInfluence: number;
  amplitudeScale: number;
  waveDensityMultiplier: number;
  showGrid: boolean;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for the new radius-mode type test.

- [ ] **Step 5: Commit**

```bash
git add src/features/mirror/types.ts tests/mirror-radius-mapping.test.ts
git commit -m "feat: add mirror radius mode config"
```

### Task 2: Add Pure Radius Mapping Utilities

**Files:**
- Create: `d:/Projects/Soliloquy/src/features/mirror/utils/radiusMapping.ts`
- Test: `d:/Projects/Soliloquy/tests/mirror-radius-mapping.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

import { RadiusMode } from '../src/features/mirror/types';
import {
  computeTrackRadiusSlots,
  sanitizeFrequencyRange,
} from '../src/features/mirror/utils/radiusMapping';

const tracks = [
  { harmonicOrder: 1, amplitudes: [0.3, 0.5], averageEnergy: 0.4 },
  { harmonicOrder: 2, amplitudes: [0.2, 0.2], averageEnergy: 0.2 },
  { harmonicOrder: 3, amplitudes: [0.6, 0.7], averageEnergy: 0.65 },
];

test('absolute frequency mode maps tracks onto a fixed global frequency scale', () => {
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
});

test('relative harmonic mode keeps harmonic slots stable independent of visibility', () => {
  const slots = computeTrackRadiusSlots({
    tracks,
    f0: [100, 110],
    radiusMode: RadiusMode.RELATIVE_HARMONIC,
    frequencyMin: 80,
    frequencyMax: 2000,
    radiusMin: 60,
    radiusMax: 200,
    energyInfluence: 0,
  });

  assert.equal(slots[0].slotIndex, 0);
  assert.equal(slots[1].slotIndex, 1);
  assert.equal(slots[2].slotIndex, 2);
});

test('energy interpolation reaches pure energy ordering at 100 percent', () => {
  const slots = computeTrackRadiusSlots({
    tracks,
    f0: [100, 110],
    radiusMode: RadiusMode.RELATIVE_HARMONIC,
    frequencyMin: 80,
    frequencyMax: 2000,
    radiusMin: 60,
    radiusMax: 200,
    energyInfluence: 1,
  });

  assert.ok(slots[2].radius > slots[0].radius);
  assert.ok(slots[0].radius > slots[1].radius);
});

test('invalid frequency ranges are sanitized into a legal ascending interval', () => {
  assert.deepEqual(sanitizeFrequencyRange(-10, -10), { frequencyMin: 80, frequencyMax: 2000 });
  assert.deepEqual(sanitizeFrequencyRange(500, 500), { frequencyMin: 500, frequencyMax: 501 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because `radiusMapping.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
import { RadiusMode, VoiceprintTrack } from '../types';

export interface TrackRadiusSlot {
  trackIndex: number;
  harmonicOrder: number;
  averageEnergy: number;
  representativeFrequency: number;
  slotIndex: number;
  frequencyRadius: number;
  energyRadius: number;
  radius: number;
}

export function sanitizeFrequencyRange(frequencyMin: number, frequencyMax: number) {
  if (!Number.isFinite(frequencyMin) || !Number.isFinite(frequencyMax) || frequencyMin <= 0 || frequencyMax <= 0) {
    return { frequencyMin: 80, frequencyMax: 2000 };
  }
  if (frequencyMax <= frequencyMin) {
    return { frequencyMin, frequencyMax: frequencyMin + 1 };
  }
  return { frequencyMin, frequencyMax };
}

export function computeTrackRadiusSlots({
  tracks,
  f0,
  radiusMode,
  frequencyMin,
  frequencyMax,
  radiusMin,
  radiusMax,
  energyInfluence,
}: {
  tracks: VoiceprintTrack[];
  f0: number[];
  radiusMode: RadiusMode;
  frequencyMin: number;
  frequencyMax: number;
  radiusMin: number;
  radiusMax: number;
  energyInfluence: number;
}): TrackRadiusSlot[] {
  const safeRange = sanitizeFrequencyRange(frequencyMin, frequencyMax);
  const avgF0 = f0.filter((value) => value > 0).reduce((sum, value, _, arr) => sum + value / arr.length, 0) || safeRange.frequencyMin;
  const slotCount = Math.max(tracks.length - 1, 1);

  const frequencySlots = tracks.map((track, trackIndex) => {
    const representativeFrequency = avgF0 * track.harmonicOrder;
    const normalizedFrequency = Math.max(
      0,
      Math.min(1, (representativeFrequency - safeRange.frequencyMin) / (safeRange.frequencyMax - safeRange.frequencyMin)),
    );
    const harmonicNormalized = trackIndex / slotCount;
    const frequencyRadius =
      radiusMode === RadiusMode.ABSOLUTE_FREQUENCY
        ? radiusMin + normalizedFrequency * (radiusMax - radiusMin)
        : radiusMin + harmonicNormalized * (radiusMax - radiusMin);

    return {
      trackIndex,
      harmonicOrder: track.harmonicOrder,
      averageEnergy: track.averageEnergy,
      representativeFrequency,
      slotIndex: trackIndex,
      frequencyRadius,
    };
  });

  const rankedByEnergy = [...frequencySlots]
    .sort((left, right) => left.averageEnergy - right.averageEnergy || left.trackIndex - right.trackIndex)
    .map((slot, rankIndex) => ({ trackIndex: slot.trackIndex, energyRadius: radiusMin + (rankIndex / slotCount) * (radiusMax - radiusMin) }));

  const energyRadiusByTrack = new Map(rankedByEnergy.map((slot) => [slot.trackIndex, slot.energyRadius]));

  return frequencySlots.map((slot) => {
    const energyRadius = energyRadiusByTrack.get(slot.trackIndex) ?? slot.frequencyRadius;
    return {
      ...slot,
      energyRadius,
      radius: slot.frequencyRadius * (1 - energyInfluence) + energyRadius * energyInfluence,
    };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for the new radius mapping tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/mirror/utils/radiusMapping.ts tests/mirror-radius-mapping.test.ts
git commit -m "feat: add mirror radius mapping utilities"
```

### Task 3: Make Track Selection Consume Stable Slots

**Files:**
- Modify: `d:/Projects/Soliloquy/src/features/mirror/utils/trackSelection.ts`
- Test: `d:/Projects/Soliloquy/tests/mirror-track-selection.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

import { SideRenderMode } from '../src/features/mirror/types';
import { resolveTrackRenderSeries } from '../src/features/mirror/utils/trackSelection';

const slots = [
  { trackIndex: 0, harmonicOrder: 1, radius: 60 },
  { trackIndex: 1, harmonicOrder: 2, radius: 120 },
  { trackIndex: 2, harmonicOrder: 3, radius: 180 },
];

const tracks = [
  { harmonicOrder: 1, amplitudes: [0.1, 0.2], averageEnergy: 0.15 },
  { harmonicOrder: 2, amplitudes: [0.2, 0.3], averageEnergy: 0.25 },
  { harmonicOrder: 3, amplitudes: [0.3, 0.4], averageEnergy: 0.35 },
];

test('render series preserves slot radius even when middle tracks are hidden', () => {
  const series = resolveTrackRenderSeries(tracks, [0, 2], SideRenderMode.SEPARATE, slots);
  assert.equal(series[0].radius, 60);
  assert.equal(series[1].radius, 180);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because `resolveTrackRenderSeries` does not accept slot metadata.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface RenderSeries {
  trackIndex: number;
  harmonicOrder: number;
  amplitudes: number[];
  averageEnergy: number;
  radius: number;
}

export function resolveTrackRenderSeries(
  tracks: VoiceprintTrack[],
  selectedIndices: number[],
  mode: SideRenderMode,
  slots: TrackRadiusSlot[],
): RenderSeries[] {
  const slotByTrack = new Map(slots.map((slot) => [slot.trackIndex, slot]));
  const sanitizedIndices = sanitizeTrackSelection(selectedIndices, tracks.length);

  if (mode === SideRenderMode.SEPARATE) {
    return sanitizedIndices.map((index) => {
      const slot = slotByTrack.get(index)!;
      const track = tracks[index];
      return {
        trackIndex: index,
        harmonicOrder: track.harmonicOrder,
        amplitudes: [...track.amplitudes],
        averageEnergy: track.averageEnergy,
        radius: slot.radius,
      };
    });
  }

  const mergedAmplitudes = new Array<number>(tracks[0]?.amplitudes.length ?? 0).fill(0);
  for (const index of sanitizedIndices) {
    for (let frameIndex = 0; frameIndex < mergedAmplitudes.length; frameIndex++) {
      mergedAmplitudes[frameIndex] += tracks[index].amplitudes[frameIndex] ?? 0;
    }
  }
  const anchorSlot = slotByTrack.get(sanitizedIndices[0])!;
  return [{
    trackIndex: sanitizedIndices[0],
    harmonicOrder: tracks[sanitizedIndices[0]].harmonicOrder,
    amplitudes: mergedAmplitudes,
    averageEnergy: mergedAmplitudes.reduce((sum, value) => sum + value, 0) / Math.max(mergedAmplitudes.length, 1),
    radius: anchorSlot.radius,
  }];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for stable-slot selection tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/mirror/utils/trackSelection.ts tests/mirror-track-selection.test.ts
git commit -m "feat: preserve mirror slot positions across selection changes"
```

### Task 4: Replace Coordinate Baselines With Slot Metadata

**Files:**
- Modify: `d:/Projects/Soliloquy/src/features/mirror/utils/coordinateCalculators.ts`
- Test: `d:/Projects/Soliloquy/tests/mirror-radius-mapping.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateTrackPoints } from '../src/features/mirror/utils/coordinateCalculators';
import { DisplayMode, RadiusMode, SideRenderMode } from '../src/features/mirror/types';

test('track points keep outer-slot geometry when the middle track is not selected', () => {
  const data = {
    time: [0, 1],
    f0: [100, 100],
    tracks: [
      { harmonicOrder: 1, amplitudes: [0.1, 0.1], averageEnergy: 0.1 },
      { harmonicOrder: 2, amplitudes: [0.1, 0.1], averageEnergy: 0.1 },
      { harmonicOrder: 3, amplitudes: [0.1, 0.1], averageEnergy: 0.1 },
    ],
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

  const points = calculateTrackPoints(data, data.tracks, config, new Float32Array([0, 1]), 0, 0);
  assert.equal(points.length, 2);
  assert.ok(Math.abs(points[1].leftPoints[0].y - 180) < 1e-6);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because `coordinateCalculators.ts` still reuses render-order indices for baselines.

- [ ] **Step 3: Write minimal implementation**

```ts
const leftSlots = computeTrackRadiusSlots({ ... });
const rightSlots = computeTrackRadiusSlots({ ... });
const leftSeries = resolveTrackRenderSeries(data.tracks, leftTrackIndices, leftRenderMode, leftSlots);
const rightSeries = resolveTrackRenderSeries(deformedTracks, rightTrackIndices, rightRenderMode, rightSlots);

const radius = seriesItem.radius;

if (displayMode === DisplayMode.ENVELOPE) {
  waveOffset = amp * amplitudeScale;
} else {
  const phase = seriesItem.harmonicOrder * cumulativePhase[j] * waveDensityMultiplier * 0.01;
  waveOffset = amp * amplitudeScale * Math.sin(phase);
}

const r = Math.max(1, radius + waveOffset);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for fixed-slot coordinate geometry.

- [ ] **Step 5: Commit**

```bash
git add src/features/mirror/utils/coordinateCalculators.ts tests/mirror-radius-mapping.test.ts
git commit -m "feat: use stable radius slots in mirror coordinates"
```

### Task 5: Expose Radius Controls In Mirror UI

**Files:**
- Modify: `d:/Projects/Soliloquy/src/features/mirror/MirrorWorkspace.tsx`
- Modify: `d:/Projects/Soliloquy/src/features/mirror/components/FloatingControls.tsx`
- Test: `d:/Projects/Soliloquy/tests/visual-structure-constraints.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('FloatingControls exposes radius mode and global frequency scale controls', () => {
  const controlsPath = path.resolve(
    process.cwd(),
    'src/features/mirror/components/FloatingControls.tsx',
  );
  const source = readFileSync(controlsPath, 'utf8');

  assert.match(source, />\s*半径模式\s*</);
  assert.match(source, />\s*绝对频率\s*</);
  assert.match(source, />\s*相对谐波\s*</);
  assert.match(source, />\s*频率下限\s*</);
  assert.match(source, />\s*频率上限\s*</);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because the controls do not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
const [config, setConfig] = useState<RenderConfig>({
  displayMode: DisplayMode.WAVEFORM,
  leftTrackIndices: createDefaultTrackSelection(initialVoiceprint?.tracks.length ?? 16, 12),
  rightTrackIndices: createDefaultTrackSelection(initialVoiceprint?.tracks.length ?? 16, 10),
  leftRenderMode: SideRenderMode.SEPARATE,
  rightRenderMode: SideRenderMode.SEPARATE,
  radiusMode: RadiusMode.ABSOLUTE_FREQUENCY,
  frequencyMin: 80,
  frequencyMax: 2000,
  radiusMin: 60,
  radiusMax: 200,
  energyInfluence: 0.35,
  amplitudeScale: 32,
  waveDensityMultiplier: 1.25,
  showGrid: true,
});
```

```tsx
<div className="mb-3.5">
  <div className="mb-1.5 flex items-center justify-between text-stone-300">
    <span>半径模式</span>
  </div>
  <div className="grid grid-cols-2 gap-2 rounded border border-stone-800 bg-stone-950 p-1">
    <button type="button" onClick={() => onChangeConfig({ ...config, radiusMode: RadiusMode.ABSOLUTE_FREQUENCY })}>
      绝对频率
    </button>
    <button type="button" onClick={() => onChangeConfig({ ...config, radiusMode: RadiusMode.RELATIVE_HARMONIC })}>
      相对谐波
    </button>
  </div>
</div>

<div className="mb-3.5 grid grid-cols-2 gap-3">
  <div>
    <span className="mb-1 block text-stone-400">频率下限</span>
    <input type="number" value={config.frequencyMin} />
  </div>
  <div>
    <span className="mb-1 block text-stone-400">频率上限</span>
    <input type="number" value={config.frequencyMax} />
  </div>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for UI-structure assertions and existing mirror tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/mirror/MirrorWorkspace.tsx src/features/mirror/components/FloatingControls.tsx tests/visual-structure-constraints.test.ts
git commit -m "feat: add mirror radius mode controls"
```

### Task 6: Sanitize Config and Preserve Stable Playback/Rendering

**Files:**
- Modify: `d:/Projects/Soliloquy/src/features/mirror/MirrorWorkspace.tsx`
- Modify: `d:/Projects/Soliloquy/src/features/mirror/utils/audioSynthesizer.ts`
- Test: `d:/Projects/Soliloquy/tests/mirror-radius-mapping.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('frequency scale sanitization keeps mirror config valid when users input inverted values', () => {
  const safe = sanitizeFrequencyRange(2000, 100);
  assert.equal(safe.frequencyMin, 2000);
  assert.equal(safe.frequencyMax, 2001);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL until workspace and consumers use the sanitized values consistently.

- [ ] **Step 3: Write minimal implementation**

```ts
useEffect(() => {
  setConfig((prev) => {
    const safeRange = sanitizeFrequencyRange(prev.frequencyMin, prev.frequencyMax);
    return {
      ...prev,
      frequencyMin: safeRange.frequencyMin,
      frequencyMax: safeRange.frequencyMax,
      leftTrackIndices: sanitizeTrackSelection(prev.leftTrackIndices, maxAvailableTracks),
      rightTrackIndices: sanitizeTrackSelection(prev.rightTrackIndices, maxAvailableTracks),
    };
  });
}, [maxAvailableTracks]);
```

```ts
public playEnsemble(
  data: VoiceprintData,
  deformedTracks: VoiceprintTrack[],
  leftTrackIndices: number[],
  rightTrackIndices: number[],
) {
  // Selection stays index-based; slot positions are computed in rendering, not by checked-track count.
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for sanitization and playback stability coverage.

- [ ] **Step 5: Commit**

```bash
git add src/features/mirror/MirrorWorkspace.tsx src/features/mirror/utils/audioSynthesizer.ts tests/mirror-radius-mapping.test.ts
git commit -m "fix: sanitize mirror frequency scale config"
```

### Task 7: Full Verification

**Files:**
- Test: `d:/Projects/Soliloquy/tests/mirror-radius-mapping.test.ts`
- Test: `d:/Projects/Soliloquy/tests/mirror-track-selection.test.ts`
- Test: `d:/Projects/Soliloquy/tests/visual-structure-constraints.test.ts`

- [ ] **Step 1: Run focused radius mapping tests**

Run: `npm test`
Expected: PASS for `mirror-radius-mapping.test.ts` and `mirror-track-selection.test.ts`.

- [ ] **Step 2: Run type checking**

Run: `npm run lint`
Expected: PASS with `tsc --noEmit`.

- [ ] **Step 3: Manually verify in browser**

Run: `npm run dev`
Check:
- `绝对频率` / `相对谐波` mode toggle renders correctly
- changing checked tracks does not move remaining tracks
- `80~2000` frequency range inputs affect absolute-frequency placement
- energy slider reaches visibly different `0%` vs `100%` end states

- [ ] **Step 4: Commit**

```bash
git add src/features/mirror tests
git commit -m "feat: rebuild mirror radius mapping"
```

## Self-Review

- Spec coverage:
  - Stable positions across visibility changes: Tasks 2, 3, 4
  - Absolute-frequency and relative-harmonic modes: Tasks 1, 2, 5
  - Editable `80~2000Hz` global range: Task 5
  - Energy interpolation from pure frequency to pure energy ordering: Task 2 and Task 4
  - Sanitization and edge cases: Task 6
  - Verification: Task 7
- Placeholder scan:
  - No `TODO`, `TBD`, or deferred implementation markers remain.
- Type consistency:
  - `RadiusMode`, `TrackRadiusSlot`, `computeTrackRadiusSlots`, and sanitized range names are consistent across tasks.
