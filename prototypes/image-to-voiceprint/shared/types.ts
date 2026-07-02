export interface PrototypeVoiceprintTrack {
  harmonicOrder: number;
  amplitudes: number[];
  averageEnergy: number;
}

export interface PrototypeVoiceprintData {
  time: number[];
  f0: number[];
  tracks: PrototypeVoiceprintTrack[];
  duration: number;
  sampleCount: number;
  referenceRms: number;
  referencePeak: number;
}
