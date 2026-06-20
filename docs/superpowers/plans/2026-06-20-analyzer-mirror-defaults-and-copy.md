# Analyzer And Mirror Defaults And Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align analyzer and mirror defaults with the newly agreed workflow, fix narrow-panel line wrapping, and keep explanatory copy consistent with the actual DSP/deformation behavior.

**Architecture:** Update default state values in analyzer and mirror entry components, then tighten a few narrow UI strings and count labels so side panels stop breaking awkwardly. Add focused tests for the new defaults and copy constraints before changing implementation.

**Tech Stack:** React 19, TypeScript, Vite, node:test

---

## File Map

- Modify: `d:/Projects/Soliloquy/src/features/analyzer/AnalyzerWorkspace.tsx`
- Modify: `d:/Projects/Soliloquy/src/features/analyzer/components/AnalyzerJobList.tsx`
- Modify: `d:/Projects/Soliloquy/src/features/analyzer/components/Recorder.tsx`
- Modify: `d:/Projects/Soliloquy/src/features/mirror/MirrorWorkspace.tsx`
- Modify: `d:/Projects/Soliloquy/src/features/mirror/components/FloatingControls.tsx`
- Test: `d:/Projects/Soliloquy/tests/visual-structure-constraints.test.ts`

### Task 1: Lock New Defaults With Tests

**Files:**
- Test: `d:/Projects/Soliloquy/tests/visual-structure-constraints.test.ts`
- Modify: `d:/Projects/Soliloquy/src/features/analyzer/AnalyzerWorkspace.tsx`
- Modify: `d:/Projects/Soliloquy/src/features/mirror/MirrorWorkspace.tsx`

- [ ] **Step 1: Write the failing test**

```ts
test('AnalyzerWorkspace defaults to N=7 harmonics', () => {
  const source = readFileSync(
    path.resolve(process.cwd(), 'src/features/analyzer/AnalyzerWorkspace.tsx'),
    'utf8',
  );

  assert.match(source, /const \[numHarmonics, setNumHarmonics\] = useState<number>\(7\)/);
});

test('MirrorWorkspace uses the agreed default render and deformation values', () => {
  const source = readFileSync(
    path.resolve(process.cwd(), 'src/features/mirror/MirrorWorkspace.tsx'),
    'utf8',
  );

  assert.match(source, /displayMode: DisplayMode\.WAVEFORM/);
  assert.match(source, /leftRenderMode: SideRenderMode\.SEPARATE/);
  assert.match(source, /rightRenderMode: SideRenderMode\.MERGED/);
  assert.match(source, /energyInfluence: 1/);
  assert.match(source, /amplitudeScale: 40/);
  assert.match(source, /radiusMin: 40/);
  assert.match(source, /radiusMax: 400/);
  assert.match(source, /waveDensityMultiplier: 2/);
  assert.match(source, /feedbackDecay: 0\.45/);
  assert.match(source, /foldThreshold: 0\.55/);
  assert.match(source, /ruminationFrequency: 5/);
  assert.match(source, /ruminationStrength: 0\.2/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because analyzer still defaults to `5`, mirror still uses the previous values, and right side render mode is not `MERGED`.

- [ ] **Step 3: Write minimal implementation**

```ts
const [numHarmonics, setNumHarmonics] = useState<number>(7);
```

```ts
const [config, setConfig] = useState<RenderConfig>({
  displayMode: DisplayMode.WAVEFORM,
  leftTrackIndices: createDefaultTrackSelection(initialVoiceprint?.tracks.length ?? 16, 12),
  rightTrackIndices: createDefaultTrackSelection(initialVoiceprint?.tracks.length ?? 16, 10),
  leftRenderMode: SideRenderMode.SEPARATE,
  rightRenderMode: SideRenderMode.MERGED,
  radiusMode: RadiusMode.ABSOLUTE_FREQUENCY,
  frequencyMin: 80,
  frequencyMax: 2000,
  radiusMin: 40,
  radiusMax: 400,
  energyInfluence: 1,
  amplitudeScale: 40,
  waveDensityMultiplier: 2,
  showGrid: true,
});

const [deformParams, setDeformParams] = useState<DeformationParams>({
  feedbackDecay: 0.45,
  foldThreshold: 0.55,
  ruminationFrequency: 5,
  ruminationStrength: 0.2,
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for the new default-value assertions.

### Task 2: Shorten Narrow-Panel Copy And Count Labels

**Files:**
- Test: `d:/Projects/Soliloquy/tests/visual-structure-constraints.test.ts`
- Modify: `d:/Projects/Soliloquy/src/features/analyzer/components/AnalyzerJobList.tsx`
- Modify: `d:/Projects/Soliloquy/src/features/analyzer/components/Recorder.tsx`
- Modify: `d:/Projects/Soliloquy/src/features/analyzer/AnalyzerWorkspace.tsx`

- [ ] **Step 1: Write the failing test**

```ts
test('Analyzer side-panel copy avoids long wrapped phrases in narrow layouts', () => {
  const jobListSource = readFileSync(
    path.resolve(process.cwd(), 'src/features/analyzer/components/AnalyzerJobList.tsx'),
    'utf8',
  );
  const recorderSource = readFileSync(
    path.resolve(process.cwd(), 'src/features/analyzer/components/Recorder.tsx'),
    'utf8',
  );
  const workspaceSource = readFileSync(
    path.resolve(process.cwd(), 'src/features/analyzer/AnalyzerWorkspace.tsx'),
    'utf8',
  );

  assert.match(jobListSource, />导入后在此切换任务。</);
  assert.match(jobListSource, /\{jobs\.length\}<\/span>/);
  assert.doesNotMatch(jobListSource, />\s*项\s*</);

  assert.match(recorderSource, />5秒</);
  assert.match(recorderSource, />10秒</);
  assert.doesNotMatch(recorderSource, />分段 5 秒</);
  assert.doesNotMatch(recorderSource, />分段 10 秒</);

  assert.match(workspaceSource, />\s*N\s*</);
  assert.doesNotMatch(workspaceSource, /N = 2/);
  assert.doesNotMatch(workspaceSource, /N = 7/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because the old long copy and `项` suffix still exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
<div className="text-white/40">导入后在此切换任务。</div>
```

```tsx
<div className="rounded border border-white/10 bg-black px-2 py-1 text-white/60">
  <span style={{ fontFamily: 'var(--font-mono)' }}>{jobs.length}</span>
</div>
```

```tsx
<button ...>5秒</button>
<button ...>10秒</button>
```

```tsx
<span className="text-white/60">N</span>
...
<span style={{ fontFamily: 'var(--font-mono)' }}>2</span>
<span style={{ fontFamily: 'var(--font-mono)' }}>7</span>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for the narrow-copy assertions.

### Task 3: Verify The Whole Slice

**Files:**
- Test: `d:/Projects/Soliloquy/tests/visual-structure-constraints.test.ts`

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: PASS for all tests.

- [ ] **Step 2: Run type checking**

Run: `npm run lint`
Expected: PASS with `tsc --noEmit`.

- [ ] **Step 3: Manual smoke check**

Run: `npm run dev`
Check:
- analyzer shows default `N = 7`
- task list subtitle and count badge do not wrap awkwardly
- recorder duration buttons stay on one line
- mirror opens with waveform, left separate / right merged, and the agreed defaults

## Self-Review

- Spec coverage:
  - analyzer default `N=7`: Task 1
  - mirror default deformation/render values: Task 1
  - narrow-panel line-wrap cleanup: Task 2
  - final verification: Task 3
- Placeholder scan:
  - No placeholders or deferred work remain.
- Type consistency:
  - Uses the existing `RenderConfig`, `SideRenderMode`, and analyzer state names already in the codebase.
