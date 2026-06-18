import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { AnalyzedAudio } from '../../features/analyzer/types';
import { saveStoredVoiceprint } from '../../features/voiceprint/repository';
import { VoiceprintData } from '../../features/voiceprint/types';

export type AnalyzerSourceType = 'upload' | 'mic';
export type AnalyzerJobStatus = 'queued' | 'processing' | 'ready' | 'error';

export interface AnalyzerJobInput {
  audioData: Float32Array;
  sampleRate: number;
  fileName: string;
  sourceType: AnalyzerSourceType;
}

export interface AnalyzerJob {
  id: string;
  sourceName: string;
  sourceType: AnalyzerSourceType;
  createdAt: string;
  status: AnalyzerJobStatus;
  rawAudio: Float32Array;
  sampleRate: number;
  analysis?: AnalyzedAudio;
  voiceprint?: VoiceprintData;
  error?: string;
  selectedTracks: boolean[];
}

interface AnalyzerRepositoryValue {
  jobs: AnalyzerJob[];
  selectedJobId: string | null;
  selectedJob: AnalyzerJob | null;
  enqueueJob: (input: AnalyzerJobInput) => string;
  updateJob: (id: string, updater: (job: AnalyzerJob) => AnalyzerJob) => void;
  selectJob: (id: string | null) => void;
  clearJobs: () => void;
  exportableJobs: AnalyzerJob[];
}

const AnalyzerRepositoryContext = createContext<AnalyzerRepositoryValue | null>(null);

function createId() {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function AnalyzerRepositoryProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<AnalyzerJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const enqueueJob = useCallback((input: AnalyzerJobInput) => {
    const id = createId();
    const nextJob: AnalyzerJob = {
      id,
      sourceName: input.fileName,
      sourceType: input.sourceType,
      createdAt: new Date().toISOString(),
      status: 'queued',
      rawAudio: input.audioData,
      sampleRate: input.sampleRate,
      selectedTracks: [],
    };

    setJobs((current) => [nextJob, ...current]);
    setSelectedJobId(id);
    return id;
  }, []);

  const updateJob = useCallback((id: string, updater: (job: AnalyzerJob) => AnalyzerJob) => {
    setJobs((current) =>
      current.map((job) => {
        if (job.id !== id) {
          return job;
        }

        const updated = updater(job);

        if (updated.voiceprint) {
          saveStoredVoiceprint({
            id: updated.id,
            name: updated.sourceName,
            createdAt: updated.createdAt,
            sourceType: updated.sourceType,
            voiceprint: updated.voiceprint,
          });
        }

        return updated;
      }),
    );
  }, []);

  const clearJobs = useCallback(() => {
    setJobs([]);
    setSelectedJobId(null);
  }, []);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );

  useEffect(() => {
    if (!selectedJobId && jobs.length > 0) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, selectedJobId]);

  const value = useMemo<AnalyzerRepositoryValue>(
    () => ({
      jobs,
      selectedJobId,
      selectedJob,
      enqueueJob,
      updateJob,
      selectJob: setSelectedJobId,
      clearJobs,
      exportableJobs: jobs.filter((job) => job.status === 'ready' && job.voiceprint),
    }),
    [clearJobs, enqueueJob, jobs, selectedJob, selectedJobId, updateJob],
  );

  return (
    <AnalyzerRepositoryContext.Provider value={value}>
      {children}
    </AnalyzerRepositoryContext.Provider>
  );
}

export function useAnalyzerRepository() {
  const context = useContext(AnalyzerRepositoryContext);
  if (!context) {
    throw new Error('useAnalyzerRepository must be used within AnalyzerRepositoryProvider');
  }
  return context;
}
