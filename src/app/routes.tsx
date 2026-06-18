import { useMemo } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';

import { useAnalyzerRepository } from './providers/AnalyzerRepositoryProvider';
import AnalyzerWorkspace from '../features/analyzer/AnalyzerWorkspace';
import MirrorWorkspace from '../features/mirror/MirrorWorkspace';
import { getStoredVoiceprint } from '../features/voiceprint/repository';

function MirrorRoute() {
  const { itemId } = useParams();
  const { jobs } = useAnalyzerRepository();

  const selected = useMemo(() => {
    if (!itemId) {
      return null;
    }

    const fromMemory = jobs.find((job) => job.id === itemId && job.voiceprint);
    if (fromMemory?.voiceprint) {
      return {
        voiceprint: fromMemory.voiceprint,
        name: fromMemory.sourceName,
      };
    }

    const fromStorage = getStoredVoiceprint(itemId);
    if (!fromStorage) {
      return null;
    }

    return {
      voiceprint: fromStorage.voiceprint,
      name: fromStorage.name,
    };
  }, [itemId, jobs]);

  return (
    <MirrorWorkspace
      initialVoiceprint={selected?.voiceprint ?? null}
      sessionName={selected?.name}
      source={selected ? 'analyzer-job' : 'demo'}
    />
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/analyzer" replace />} />
      <Route path="/analyzer" element={<AnalyzerWorkspace />} />
      <Route path="/analyzer/:itemId" element={<AnalyzerWorkspace />} />
      <Route path="/mirror" element={<MirrorWorkspace source="demo" />} />
      <Route path="/mirror/:itemId" element={<MirrorRoute />} />
    </Routes>
  );
}
