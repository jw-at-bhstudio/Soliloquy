export type { VoiceprintData, VoiceprintTrack, MirrorSessionSource } from '../voiceprint/types';

export interface DeformationParams {
  feedbackDecay: number;      // 反馈残留 (0 ~ 0.9)
  foldThreshold: number;      // 内卷塌陷阈值 (0.1 ~ 1.0)
  ruminationFrequency: number; // 思维纠缠频段 (0 ~ 10)
  ruminationStrength: number;  // 思维纠缠强度 (0 ~ 0.5)
}

export enum DisplayMode {
  ENVELOPE = "ENVELOPE",   // 振幅包络模式 (Concentric circles)
  WAVEFORM = "WAVEFORM",   // 微波共鸣模式 (Detailed carrier soundwave fringes)
}

export enum SideRenderMode {
  SEPARATE = "SEPARATE",
  MERGED = "MERGED",
}

export enum RadiusMode {
  ABSOLUTE_FREQUENCY = "ABSOLUTE_FREQUENCY",
  RELATIVE_HARMONIC = "RELATIVE_HARMONIC",
}

export interface RenderConfig {
  displayMode: DisplayMode;
  leftTrackIndices: number[];
  rightTrackIndices: number[];
  leftRenderMode: SideRenderMode;
  rightRenderMode: SideRenderMode;
  radiusMode?: RadiusMode;
  frequencyMin?: number;
  frequencyMax?: number;
  radiusMin: number;         // R_min
  radiusMax: number;         // R_max
  energyInfluence: number;   // 频率半径到平均振幅半径的插值比例
  amplitudeContrast?: number; // Sigmoid contrast slope applied before amplitude scaling
  amplitudeScale: number;    // Amplitude scaling for visualization waves
  leftScale?: number;        // Global left hemisphere scale multiplier
  rightScale?: number;       // Global right hemisphere scale multiplier
  waveDensityMultiplier: number; // Carrier frequency divider / density controls
  showGrid: boolean;         // Show radial guides
}
