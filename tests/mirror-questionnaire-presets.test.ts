import test from 'node:test';
import assert from 'node:assert/strict';

import { parseQuestionnairePresets } from '../src/features/mirror/presets/questionnaireAdapter';
import { mapPresetToMirrorState } from '../src/features/mirror/presets/mapping';
import { mergeMirrorPresetConfig } from '../src/features/mirror/MirrorWorkspace';
import { DisplayMode, SideRenderMode } from '../src/features/mirror/types';

test('parseQuestionnairePresets converts a dataset array into preset records', () => {
  const records = parseQuestionnairePresets([
    {
      id: 'ce-re-01',
      role: 'student',
      roleLabel: '学员',
      Y1: '很像我真实的声音',
      CE1: 78,
      CE2: 82,
      CE3: 74,
      CE4: 70,
      RE1: 18,
      RE2: 24,
      RE3: 34,
      RE4: 40,
      ceMean: 76,
      reMean: 29,
      status: 'Clear Type',
      statusBand: { ce: 'HIGH', re: 'LOW' },
    },
  ]);

  assert.equal(records.length, 1);
  assert.equal(records[0].id, 'ce-re-01');
  assert.equal(records[0].sourceType, 'dataset-entry');
});

test('parseQuestionnairePresets converts a single questionnaire result into one preset record', () => {
  const records = parseQuestionnairePresets({
    createdAt: '2026-06-21T12:00:00.000Z',
    Y1: '应该是我，但是音更低',
    responses: {
      CE1: 40,
      CE2: 50,
      CE3: 60,
      CE4: 70,
      RE1: 20,
      RE2: 30,
      RE3: 40,
      RE4: 50,
    },
    summary: {
      ceMean: 55,
      reMean: 35,
      status: 'Clear Type',
      statusBand: { ce: 'HIGH', re: 'LOW' },
    },
  });

  assert.equal(records.length, 1);
  assert.equal(records[0].sourceType, 'questionnaire-result');
  assert.equal(records[0].Y1, '应该是我，但是音更低');
});

test('parseQuestionnairePresets rejects unknown Y1 labels', () => {
  assert.throws(
    () =>
      parseQuestionnairePresets([
        {
          id: 'bad-entry',
          Y1: '未知选项',
          CE1: 1,
          CE2: 1,
          CE3: 1,
          CE4: 1,
          RE1: 1,
          RE2: 1,
          RE3: 1,
          RE4: 1,
          ceMean: 1,
          reMean: 1,
          status: 'Clear Type',
        },
      ]),
    /未知 Y1 选项/,
  );
});

test('parseQuestionnairePresets rejects unknown status values', () => {
  assert.throws(
    () =>
      parseQuestionnairePresets([
        {
          id: 'bad-status',
          Y1: '不太像我',
          CE1: 1,
          CE2: 1,
          CE3: 1,
          CE4: 1,
          RE1: 1,
          RE2: 1,
          RE3: 1,
          RE4: 1,
          ceMean: 1,
          reMean: 1,
          status: 'Unknown Type',
        },
      ]),
    /未知 status/,
  );
});

test('mapPresetToMirrorState maps status, Y1, CE and RE values into mirror patches', () => {
  const result = mapPresetToMirrorState({
    id: 'ce-re-02',
    label: 'ce-re-02',
    sourceType: 'dataset-entry',
    Y1: '应该是我，但是音更高',
    CE1: 99,
    CE2: 1,
    CE3: 50,
    CE4: 99,
    RE1: 99,
    RE2: 1,
    RE3: 50,
    RE4: 99,
    ceMean: 80,
    reMean: 20,
    status: 'Torn Type',
  });

  assert.deepEqual(result.renderConfigPatch.leftTrackIndices, [3, 7]);
  assert.deepEqual(result.renderConfigPatch.rightTrackIndices, [3, 7]);
  assert.equal(result.renderConfigPatch.leftRenderMode, SideRenderMode.SEPARATE);
  assert.equal(result.renderConfigPatch.rightRenderMode, SideRenderMode.SEPARATE);
  assert.equal(result.renderConfigPatch.radiusMin, 40);
  assert.equal(result.renderConfigPatch.energyInfluence, 0);
  assert.equal(result.renderConfigPatch.amplitudeContrast, 7);
  assert.equal(result.renderConfigPatch.amplitudeScale, 100);
  assert.equal(result.renderConfigPatch.leftScale, 1.8061);
  assert.equal(result.renderConfigPatch.rightScale, 1.1939);
  assert.equal(result.deformParamsPatch.ruminationFrequency, 10);
  assert.equal(result.deformParamsPatch.feedbackDecay, 0);
  assert.equal(result.meta.status, 'Torn Type');
});

test('mergeMirrorPresetConfig applies questionnaire patches without overwriting display toggles', () => {
  const next = mergeMirrorPresetConfig(
    {
      displayMode: DisplayMode.WAVEFORM,
      leftTrackIndices: [1, 2],
      rightTrackIndices: [1, 2],
      leftRenderMode: SideRenderMode.MERGED,
      rightRenderMode: SideRenderMode.MERGED,
      radiusMin: 100,
      radiusMax: 300,
      energyInfluence: 0.4,
      amplitudeScale: 55,
      waveDensityMultiplier: 1.5,
      showGrid: false,
    },
    {
      radiusMin: 40,
      leftTrackIndices: [0],
      rightTrackIndices: [0],
      leftRenderMode: SideRenderMode.SEPARATE,
      rightRenderMode: SideRenderMode.SEPARATE,
    },
  );

  assert.equal(next.displayMode, DisplayMode.WAVEFORM);
  assert.equal(next.showGrid, false);
  assert.equal(next.radiusMin, 40);
  assert.deepEqual(next.leftTrackIndices, [0]);
  assert.deepEqual(next.rightTrackIndices, [0]);
  assert.equal(next.leftRenderMode, SideRenderMode.SEPARATE);
  assert.equal(next.rightRenderMode, SideRenderMode.SEPARATE);
});
