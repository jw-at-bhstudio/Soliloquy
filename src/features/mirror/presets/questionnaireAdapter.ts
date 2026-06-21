import type { MirrorPresetRecord } from './types';

const VALID_Y1_OPTIONS = new Set([
  '不太像我',
  '应该是我，但是音更低',
  '应该是我，但是音更高',
  '很像我真实的声音',
]);

const VALID_STATUSES = new Set([
  'Clear Type',
  'Torn Type',
  'Stuck Type',
  'Paused Type',
]);

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function assertValidY1(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !VALID_Y1_OPTIONS.has(value)) {
    throw new Error(`未知 Y1 选项: ${String(value)}`);
  }
}

function assertValidStatus(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !VALID_STATUSES.has(value)) {
    throw new Error(`未知 status: ${String(value)}`);
  }
}

function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value);
}

function getBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function getStatusBand(value: unknown): MirrorPresetRecord['statusBand'] {
  if (!isRecord(value)) {
    return undefined;
  }

  const ce = typeof value.ce === 'string' ? value.ce : undefined;
  const re = typeof value.re === 'string' ? value.re : undefined;

  if (!ce || !re) {
    return undefined;
  }

  return { ce, re };
}

function parseDatasetEntry(entry: UnknownRecord): MirrorPresetRecord {
  assertValidY1(entry.Y1);
  assertValidStatus(entry.status);

  const id = typeof entry.id === 'string' ? entry.id : 'dataset-entry';
  const label = typeof entry.label === 'string' ? entry.label : id;

  return {
    id,
    label,
    sourceType: 'dataset-entry',
    role: typeof entry.role === 'string' ? entry.role : undefined,
    roleLabel: typeof entry.roleLabel === 'string' ? entry.roleLabel : undefined,
    Y1: entry.Y1,
    CE1: toNumber(entry.CE1),
    CE2: toNumber(entry.CE2),
    CE3: toNumber(entry.CE3),
    CE4: toNumber(entry.CE4),
    RE1: toNumber(entry.RE1),
    RE2: toNumber(entry.RE2),
    RE3: toNumber(entry.RE3),
    RE4: toNumber(entry.RE4),
    ceTotal: 'ceTotal' in entry ? toNumber(entry.ceTotal) : undefined,
    reTotal: 'reTotal' in entry ? toNumber(entry.reTotal) : undefined,
    ceMean: toNumber(entry.ceMean),
    reMean: toNumber(entry.reMean),
    status: entry.status,
    statusBand: getStatusBand(entry.statusBand),
    nearCenterBand: getBoolean(entry.nearCenterBand),
  };
}

function parseQuestionnaireResult(result: UnknownRecord): MirrorPresetRecord {
  const responses = isRecord(result.responses) ? result.responses : {};
  const summary = isRecord(result.summary) ? result.summary : {};

  assertValidY1(result.Y1);
  assertValidStatus(summary.status);

  const createdAt = typeof result.createdAt === 'string' ? result.createdAt : undefined;
  const id = createdAt ?? 'questionnaire-result';

  return {
    id,
    label: id,
    sourceType: 'questionnaire-result',
    Y1: result.Y1,
    CE1: toNumber(responses.CE1),
    CE2: toNumber(responses.CE2),
    CE3: toNumber(responses.CE3),
    CE4: toNumber(responses.CE4),
    RE1: toNumber(responses.RE1),
    RE2: toNumber(responses.RE2),
    RE3: toNumber(responses.RE3),
    RE4: toNumber(responses.RE4),
    ceTotal: 'ceTotal' in summary ? toNumber(summary.ceTotal) : undefined,
    reTotal: 'reTotal' in summary ? toNumber(summary.reTotal) : undefined,
    ceMean: toNumber(summary.ceMean),
    reMean: toNumber(summary.reMean),
    status: summary.status,
    statusBand: getStatusBand(summary.statusBand),
    nearCenterBand: getBoolean(summary.nearCenterBand),
    createdAt,
  };
}

export function parseQuestionnairePresets(input: unknown): MirrorPresetRecord[] {
  if (Array.isArray(input)) {
    return input.map((entry) => parseDatasetEntry(isRecord(entry) ? entry : {}));
  }

  if (isRecord(input) && 'responses' in input && 'summary' in input) {
    return [parseQuestionnaireResult(input)];
  }

  throw new Error('不支持的问卷预设输入');
}
