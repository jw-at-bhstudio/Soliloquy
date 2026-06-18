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

export interface RenderConfig {
  displayMode: DisplayMode;
  nLeft: number;             // Left side harmonics slider limit (1 to max tracks)
  nRight: number;            // Right side harmonics slider limit (1 to max tracks)
  radiusMin: number;         // R_min
  radiusMax: number;         // R_max
  energyInfluence: number;   // 能量自适应轨道半径偏置系数
  amplitudeScale: number;    // Amplitude scaling for visualization waves
  waveDensityMultiplier: number; // Carrier frequency divider / density controls
  showGrid: boolean;         // Show radial guides
}
