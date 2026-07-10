import type { MirrorImportMode, MirrorImportState } from './types';

export function createDefaultMirrorImportState(): MirrorImportState {
  return {
    mode: 'paired-batch',
    entries: [],
    selectedEntryKey: null,
  };
}

export function createSingleFreeImportState(): MirrorImportState {
  return {
    mode: 'single-free',
    voiceprintFileName: null,
    questionnaireFileName: null,
    voiceprintData: null,
    questionnaireRecords: [],
  };
}

export function switchMirrorImportMode(
  _current: MirrorImportState,
  nextMode: MirrorImportMode,
): MirrorImportState {
  return nextMode === 'paired-batch'
    ? createDefaultMirrorImportState()
    : createSingleFreeImportState();
}
