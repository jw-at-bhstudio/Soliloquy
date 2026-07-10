import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  extractMirrorImportKey,
  mergeMirrorImportEntries,
} from '../src/features/mirror/imports/matching.ts';
import {
  createDefaultMirrorImportState,
  switchMirrorImportMode,
} from '../src/features/mirror/imports/state.ts';

test('extractMirrorImportKey uses the first dash-separated segment', () => {
  assert.equal(
    extractMirrorImportKey('陈昱彤-组委-图像.v4.voiceprint.json'),
    '陈昱彤',
  );
  assert.equal(
    extractMirrorImportKey('陈昱彤-组委-问卷数据.json'),
    '陈昱彤',
  );
  assert.equal(extractMirrorImportKey('solo.json'), 'solo');
});

test('mergeMirrorImportEntries merges both sides and marks entry status', () => {
  const pairedResult = mergeMirrorImportEntries(
    [
      {
        fileName: '陈昱彤-组委-问卷数据.json',
        questionnaireRecords: [{ id: 'questionnaire-record' } as never],
      },
    ],
    [
      {
        fileName: '陈昱彤-组委-图像.v4.voiceprint.json',
        voiceprintData: { sampleCount: 1 } as never,
      },
    ],
  );

  assert.equal(pairedResult.length, 1);
  assert.equal(pairedResult[0]?.key, '陈昱彤');
  assert.equal(pairedResult[0]?.status, 'paired');
  assert.equal(pairedResult[0]?.questionnaireFileName, '陈昱彤-组委-问卷数据.json');
  assert.equal(pairedResult[0]?.voiceprintFileName, '陈昱彤-组委-图像.v4.voiceprint.json');
});

test('mergeMirrorImportEntries marks missing questionnaire and missing voiceprint items', () => {
  const result = mergeMirrorImportEntries(
    [
      {
        fileName: '李聆溪-组委-问卷数据.json',
        questionnaireRecords: [{ id: 'questionnaire-only' } as never],
      },
    ],
    [
      {
        fileName: '陈昱彤-组委-图像.v4.voiceprint.json',
        voiceprintData: { sampleCount: 1 } as never,
      },
    ],
  );

  assert.equal(result.length, 2);
  assert.deepEqual(
    result.map((entry) => ({
      key: entry.key,
      status: entry.status,
      questionnaireFileName: entry.questionnaireFileName,
      voiceprintFileName: entry.voiceprintFileName,
    })),
    [
      {
        key: '陈昱彤',
        status: 'missing-questionnaire',
        questionnaireFileName: null,
        voiceprintFileName: '陈昱彤-组委-图像.v4.voiceprint.json',
      },
      {
        key: '李聆溪',
        status: 'missing-voiceprint',
        questionnaireFileName: '李聆溪-组委-问卷数据.json',
        voiceprintFileName: null,
      },
    ],
  );
});

test('createDefaultMirrorImportState defaults to paired-batch mode', () => {
  const result = createDefaultMirrorImportState();

  assert.equal(result.mode, 'paired-batch');
  assert.deepEqual(result.entries, []);
  assert.equal(result.selectedEntryKey, null);
});

test('switchMirrorImportMode clears previous mode data', () => {
  const result = switchMirrorImportMode(
    {
      mode: 'single-free',
      voiceprintFileName: 'voice.json',
      questionnaireFileName: 'questionnaire.json',
      voiceprintData: { sampleCount: 1 } as never,
      questionnaireRecords: [{ id: 'questionnaire-record' } as never],
    },
    'paired-batch',
  );

  assert.equal(result.mode, 'paired-batch');
  assert.deepEqual(result.entries, []);
  assert.equal(result.selectedEntryKey, null);
});

test('switchMirrorImportMode resets paired-batch state when entering single-free', () => {
  const result = switchMirrorImportMode(
    {
      mode: 'paired-batch',
      entries: [
        {
          key: '陈昱彤',
          questionnaireFileName: '陈昱彤-组委-问卷数据.json',
          voiceprintFileName: '陈昱彤-组委-图像.v4.voiceprint.json',
          questionnaireRecords: [{ id: 'questionnaire-record' } as never],
          voiceprintData: { sampleCount: 1 } as never,
          status: 'paired',
        },
      ],
      selectedEntryKey: '陈昱彤',
    },
    'single-free',
  );

  assert.equal(result.mode, 'single-free');
  assert.equal(result.voiceprintFileName, null);
  assert.equal(result.questionnaireFileName, null);
  assert.equal(result.voiceprintData, null);
  assert.deepEqual(result.questionnaireRecords, []);
});

test('MirrorModeSwitch renders both mode buttons', async () => {
  const { MirrorModeSwitch } = await import(
    '../src/features/mirror/components/MirrorModeSwitch.tsx'
  );

  const markup = renderToStaticMarkup(
    React.createElement(MirrorModeSwitch, {
      mode: 'paired-batch',
      onChange: () => {},
    }),
  );

  assert.match(markup, /批量匹配/);
  assert.match(markup, /随意单测/);
});

test('FloatingControls shows paired-batch mode by default when import is allowed', async () => {
  const { FloatingControls } = await import(
    '../src/features/mirror/components/FloatingControls.tsx'
  );

  const markup = renderToStaticMarkup(
    React.createElement(FloatingControls, {
      config: {
        displayMode: 0 as never,
        leftTrackIndices: [],
        rightTrackIndices: [],
        leftRenderMode: 0 as never,
        rightRenderMode: 0 as never,
        radiusMin: 40,
        radiusMax: 400,
        energyInfluence: 1,
        amplitudeScale: 40,
        waveDensityMultiplier: 2,
        showGrid: true,
      },
      onChangeConfig: () => {},
      deformParams: {
        feedbackDecay: 0.45,
        foldThreshold: 0.55,
        ruminationFrequency: 5,
        ruminationStrength: 0.2,
      },
      onChangeDeformParams: () => {},
      onImportJSON: () => {},
      onApplyQuestionnaireRecords: () => {},
      onClearQuestionnaireRecords: () => {},
      onLoadBuiltInDataset: () => {},
      presetRecords: [],
      selectedPresetIndex: -1,
      selectedPresetId: null,
      onApplyPreset: () => {},
      onStepPreset: () => {},
      onCopySVG: () => {},
      onPlayEnsemble: () => {},
      onStopEnsemble: () => {},
      isPlaying: false,
      maxAvailableTracks: 16,
    }),
  );

  assert.match(markup, /批量匹配/);
  assert.match(markup, /导入问卷 JSON（多选）/);
  assert.match(markup, /导入声纹 JSON（多选）/);
  assert.doesNotMatch(markup, /清空声纹|清空问卷/);
});
