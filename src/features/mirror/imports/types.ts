import type { MirrorPresetRecord } from '../presets/types';
import type { VoiceprintData } from '../types';

export type MirrorImportMode = 'paired-batch' | 'single-free';

export type PairedImportEntryStatus =
  | 'paired'
  | 'missing-questionnaire'
  | 'missing-voiceprint';

export type QuestionnaireImportCandidate = {
  fileName: string;
  questionnaireRecords: MirrorPresetRecord[];
};

export type VoiceprintImportCandidate = {
  fileName: string;
  voiceprintData: VoiceprintData;
};

export type PairedImportEntry = {
  key: string;
  questionnaireFileName: string | null;
  voiceprintFileName: string | null;
  questionnaireRecords: MirrorPresetRecord[];
  voiceprintData: VoiceprintData | null;
  status: PairedImportEntryStatus;
};

export type MirrorImportState =
  | {
      mode: 'paired-batch';
      entries: PairedImportEntry[];
      selectedEntryKey: string | null;
    }
  | {
      mode: 'single-free';
      voiceprintFileName: string | null;
      questionnaireFileName: string | null;
      voiceprintData: VoiceprintData | null;
      questionnaireRecords: MirrorPresetRecord[];
    };
