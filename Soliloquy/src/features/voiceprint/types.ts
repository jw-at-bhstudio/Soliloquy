export interface VoiceprintTrack {
  harmonicOrder: number;
  amplitudes: number[];
  averageEnergy: number;
}

export interface VoiceprintData {
  time: number[];
  f0: number[];
  tracks: VoiceprintTrack[];
  duration: number;
  sampleCount: number;
}

export type MirrorSessionSource = 'demo' | 'imported-json' | 'analyzer-job';

export interface StoredVoiceprintRecord {
  id: string;
  name: string;
  createdAt: string;
  sourceType: 'upload' | 'mic';
  voiceprint: VoiceprintData;
}
