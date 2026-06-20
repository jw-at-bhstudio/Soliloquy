import { AnalyzerJob } from '../../../app/providers/AnalyzerRepositoryProvider';
import { analyzeAudioBuffer } from './dsp';
import { analyzedAudioToVoiceprint } from '../../voiceprint/converters';
import { AnalyzedAudio } from '../types';

export interface TimerApi {
  setTimeout: (fn: () => void, timeoutMs: number) => any;
  clearTimeout: (id: any) => void;
}

export interface AnalyzerJobRunnerOptions {
  timers?: TimerApi;
  analyze?: (
    rawAudio: Float32Array,
    sampleRate: number,
    sourceName: string,
    numHarmonics: number,
  ) => AnalyzedAudio;
  updateJob: (id: string, updater: (job: AnalyzerJob) => AnalyzerJob) => void;
  setIsLoading: (value: boolean) => void;
}

function createDefaultTimerApi(): TimerApi {
  return {
    setTimeout: (fn, timeoutMs) => globalThis.setTimeout(fn, timeoutMs),
    clearTimeout: (id) => globalThis.clearTimeout(id),
  };
}

export function createAnalyzerJobRunner({
  timers = createDefaultTimerApi(),
  analyze = analyzeAudioBuffer,
  updateJob,
  setIsLoading,
}: AnalyzerJobRunnerOptions) {
  let activeJobId: string | null = null;
  let timerId: any = null;

  const start = (job: AnalyzerJob, { numHarmonics }: { numHarmonics: number }) => {
    if (activeJobId || timerId) {
      return;
    }

    activeJobId = job.id;
    setIsLoading(true);
    updateJob(job.id, (current) => ({ ...current, status: 'processing', error: undefined }));

    timerId = timers.setTimeout(() => {
      try {
        const results = analyze(job.rawAudio, job.sampleRate, job.sourceName, numHarmonics);

        updateJob(job.id, (current) => ({
          ...current,
          status: 'ready',
          analysis: results,
          voiceprint: analyzedAudioToVoiceprint(results),
          selectedTracks: new Array(results.harmonics.length).fill(true),
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : '解析音频信号时发生未知错误。';
        updateJob(job.id, (current) => ({ ...current, status: 'error', error: message }));
      } finally {
        activeJobId = null;
        timerId = null;
        setIsLoading(false);
      }
    }, 40);
  };

  const cancel = () => {
    if (timerId) {
      timers.clearTimeout(timerId);
      timerId = null;
    }

    if (activeJobId) {
      updateJob(activeJobId, (current) => {
        if (current.status !== 'processing') {
          return current;
        }
        return { ...current, status: 'queued', error: undefined };
      });
      activeJobId = null;
    }

    setIsLoading(false);
  };

  const getActiveJobId = () => activeJobId;

  return { start, cancel, getActiveJobId };
}
