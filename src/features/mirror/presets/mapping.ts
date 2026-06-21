import { SideRenderMode, type RenderConfig } from '../types';
import type { MirrorPresetRecord, MirrorPresetState } from './types';

const Y1_TRACK_TEMPLATES: Record<string, number[]> = {
  '不太像我': [0],
  '应该是我，但是音更低': [0, 1, 3],
  '应该是我，但是音更高': [3, 7],
  '很像我真实的声音': [0, 1, 2, 3, 4, 5, 6, 7],
};

const STATUS_RENDER_MODES: Record<
  string,
  Pick<RenderConfig, 'leftRenderMode' | 'rightRenderMode'>
> = {
  'Clear Type': {
    leftRenderMode: SideRenderMode.SEPARATE,
    rightRenderMode: SideRenderMode.MERGED,
  },
  'Torn Type': {
    leftRenderMode: SideRenderMode.SEPARATE,
    rightRenderMode: SideRenderMode.SEPARATE,
  },
  'Stuck Type': {
    leftRenderMode: SideRenderMode.MERGED,
    rightRenderMode: SideRenderMode.SEPARATE,
  },
  'Paused Type': {
    leftRenderMode: SideRenderMode.MERGED,
    rightRenderMode: SideRenderMode.MERGED,
  },
};

function lerp(min: number, max: number, value: number): number {
  return min + (max - min) * value;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeQuestionnaireScore(score: number): number {
  return clamp01((score - 1) / 98);
}

function roundTo4(value: number): number {
  return Number(value.toFixed(4));
}

export function mapPresetToMirrorState(record: MirrorPresetRecord): MirrorPresetState {
  const trackTemplate = Y1_TRACK_TEMPLATES[record.Y1];
  if (!trackTemplate) {
    throw new Error(`未知 Y1 选项: ${record.Y1}`);
  }

  const renderModes = STATUS_RENDER_MODES[record.status];
  if (!renderModes) {
    throw new Error(`未知 status: ${record.status}`);
  }

  const ce1 = normalizeQuestionnaireScore(record.CE1);
  const ce2 = normalizeQuestionnaireScore(record.CE2);
  const ce3 = normalizeQuestionnaireScore(record.CE3);
  const ce4 = normalizeQuestionnaireScore(record.CE4);
  const re1 = normalizeQuestionnaireScore(record.RE1);
  const re2 = normalizeQuestionnaireScore(record.RE2);
  const re3 = normalizeQuestionnaireScore(record.RE3);
  const re4 = normalizeQuestionnaireScore(record.RE4);
  const ceTotal = normalizeQuestionnaireScore(record.ceMean);
  const reTotal = normalizeQuestionnaireScore(record.reMean);

  const renderConfigPatch: Partial<RenderConfig> = {
    ...renderModes,
    leftTrackIndices: trackTemplate,
    rightTrackIndices: trackTemplate,
    radiusMin: Math.round(lerp(220, 40, ce1)),
    radiusMax: 400,
    energyInfluence: roundTo4(lerp(0, 1, ce2)),
    amplitudeScale: roundTo4(lerp(20, 100, ce4)),
  };

  Object.assign(renderConfigPatch, {
    amplitudeContrast: roundTo4(lerp(2, 12, ce3)),
    leftScale: roundTo4(lerp(1, 2, ceTotal)),
    rightScale: roundTo4(lerp(1, 2, reTotal)),
  });

  return {
    renderConfigPatch,
    deformParamsPatch: {
      ruminationFrequency: roundTo4(lerp(0, 10, re1)),
      feedbackDecay: roundTo4(lerp(0, 0.9, re2)),
      ruminationStrength: roundTo4(lerp(0, 0.4, re3)),
      foldThreshold: roundTo4(lerp(0.1, 1.0, re4)),
    },
    meta: {
      presetLabel: record.label,
      status: record.status,
      ceMean: record.ceMean,
      reMean: record.reMean,
      Y1: record.Y1,
    },
  };
}
