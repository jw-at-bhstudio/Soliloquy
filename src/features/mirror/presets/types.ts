import type { DeformationParams, RenderConfig } from '../types';

export type MirrorPresetRecord = {
  id: string;
  label: string;
  sourceType: 'questionnaire-result' | 'dataset-entry';
  role?: string;
  roleLabel?: string;
  Y1: string;
  CE1: number;
  CE2: number;
  CE3: number;
  CE4: number;
  RE1: number;
  RE2: number;
  RE3: number;
  RE4: number;
  ceTotal?: number;
  reTotal?: number;
  ceMean: number;
  reMean: number;
  status: string;
  statusBand?: {
    ce: string;
    re: string;
  };
  nearCenterBand?: boolean;
  createdAt?: string;
};

export type MirrorPresetState = {
  renderConfigPatch: Partial<RenderConfig>;
  deformParamsPatch: Partial<DeformationParams>;
  meta: {
    presetLabel: string;
    status: string;
    ceMean: number;
    reMean: number;
    Y1: string;
  };
};
