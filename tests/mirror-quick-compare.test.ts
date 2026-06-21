import test from 'node:test';
import assert from 'node:assert/strict';

import * as floatingControlsModule from '../src/features/mirror/components/FloatingControls';
import * as mirrorWorkspaceModule from '../src/features/mirror/MirrorWorkspace';
import * as sampleDatasetModule from '../src/features/mirror/presets/sampleDataset';

test('mirror input copy uses clearer labels for voiceprint input, questionnaire mapping and compare mode', () => {
  assert.equal(
    typeof floatingControlsModule.getMirrorInputCopy,
    'function',
    'expected getMirrorInputCopy to be exported',
  );

  const copy = floatingControlsModule.getMirrorInputCopy();

  assert.equal(copy.voiceprintSectionTitle, '声纹输入');
  assert.equal(copy.voiceprintImportButton, '导入声纹 JSON');
  assert.equal(copy.voiceprintSampleButton, '下载声纹示例');
  assert.equal(copy.questionnaireSectionTitle, '问卷映射');
  assert.equal(copy.questionnaireImportButton, '导入问卷结果 JSON');
  assert.equal(copy.compareModeLabel, '比较模式');
  assert.equal(copy.builtInDatasetButton, '载入 20 人比较样本');
  assert.equal(copy.previousPresetButton, '上一份');
  assert.equal(copy.nextPresetButton, '下一份');
});

test('mirror rumination controls follow RE1 to RE4 order and final labels', () => {
  assert.equal(
    typeof floatingControlsModule.getRuminationControlSpecs,
    'function',
    'expected getRuminationControlSpecs to be exported',
  );

  const controls = floatingControlsModule.getRuminationControlSpecs();

  assert.deepEqual(
    controls.map((item) => item.label),
    [
      '反复 / Recurrence',
      '残留 / Lingering',
      '扭曲 / Distortion',
      '折返 / Collapse',
    ],
  );
  assert.deepEqual(
    controls.map((item) => item.key),
    ['ruminationFrequency', 'feedbackDecay', 'ruminationStrength', 'foldThreshold'],
  );
});

test('loadBuiltInSampleDataset returns 20 preset records ready for mirror compare mode', () => {
  assert.equal(
    typeof sampleDatasetModule.loadBuiltInSampleDataset,
    'function',
    'expected loadBuiltInSampleDataset to be exported',
  );

  const records = sampleDatasetModule.loadBuiltInSampleDataset();

  assert.equal(records.length, 20);
  assert.equal(records[0]?.id, 'ce-re-01');
  assert.equal(records[18]?.nearCenterBand, true);
  assert.equal(records[19]?.nearCenterBand, true);
});

test('getNextPresetIndex moves across the dataset and clamps at both ends', () => {
  assert.equal(
    typeof mirrorWorkspaceModule.getNextPresetIndex,
    'function',
    'expected getNextPresetIndex to be exported',
  );

  assert.equal(mirrorWorkspaceModule.getNextPresetIndex(0, 20, -1), 0);
  assert.equal(mirrorWorkspaceModule.getNextPresetIndex(0, 20, 1), 1);
  assert.equal(mirrorWorkspaceModule.getNextPresetIndex(19, 20, 1), 19);
  assert.equal(mirrorWorkspaceModule.getNextPresetIndex(19, 20, -1), 18);
});
