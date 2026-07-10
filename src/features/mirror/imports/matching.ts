import type {
  PairedImportEntry,
  PairedImportEntryStatus,
  QuestionnaireImportCandidate,
  VoiceprintImportCandidate,
} from './types';

function createEmptyEntry(key: string): PairedImportEntry {
  return {
    key,
    questionnaireFileName: null,
    voiceprintFileName: null,
    questionnaireRecords: [],
    voiceprintData: null,
    status: 'missing-questionnaire',
  };
}

function resolveEntryStatus(entry: PairedImportEntry): PairedImportEntryStatus {
  if (entry.questionnaireFileName && entry.voiceprintFileName) {
    return 'paired';
  }

  if (entry.questionnaireFileName) {
    return 'missing-voiceprint';
  }

  return 'missing-questionnaire';
}

export function extractMirrorImportKey(fileName: string): string {
  const basename = fileName.replace(/(\.[^.]+)+$/u, '');
  const [firstSegment] = basename.split('-');
  return firstSegment?.trim() || basename;
}

export function mergeMirrorImportEntries(
  questionnaires: QuestionnaireImportCandidate[],
  voiceprints: VoiceprintImportCandidate[],
): PairedImportEntry[] {
  const byKey = new Map<string, PairedImportEntry>();

  for (const questionnaire of questionnaires) {
    const key = extractMirrorImportKey(questionnaire.fileName);
    const existing = byKey.get(key) ?? createEmptyEntry(key);

    byKey.set(key, {
      ...existing,
      questionnaireFileName: questionnaire.fileName,
      questionnaireRecords: questionnaire.questionnaireRecords,
    });
  }

  for (const voiceprint of voiceprints) {
    const key = extractMirrorImportKey(voiceprint.fileName);
    const existing = byKey.get(key) ?? createEmptyEntry(key);

    byKey.set(key, {
      ...existing,
      voiceprintFileName: voiceprint.fileName,
      voiceprintData: voiceprint.voiceprintData,
    });
  }

  return Array.from(byKey.values())
    .map((entry) => ({
      ...entry,
      status: resolveEntryStatus(entry),
    }))
    .sort((left, right) => left.key.localeCompare(right.key, 'zh-CN'));
}
