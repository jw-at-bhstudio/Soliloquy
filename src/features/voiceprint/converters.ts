import { AnalyzedAudio } from '../analyzer/types';
import { VoiceprintData } from './types';

export function analyzedAudioToVoiceprint(analysis: AnalyzedAudio): VoiceprintData {
  return {
    time: Array.from(analysis.times),
    f0: Array.from(analysis.f0),
    tracks: analysis.harmonics.map((track) => {
      const amplitudes = Array.from(track.amplitudes);
      const averageEnergy =
        amplitudes.reduce((sum, value) => sum + value, 0) / (amplitudes.length || 1);

      return {
        harmonicOrder: track.multiplier,
        amplitudes,
        averageEnergy,
      };
    }),
    duration: analysis.duration,
    sampleCount: analysis.frameCount,
  };
}
