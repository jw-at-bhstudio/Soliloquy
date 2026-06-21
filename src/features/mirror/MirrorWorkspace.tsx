import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import { FloatingControls } from './components/FloatingControls';
import { VoiceprintCanvas } from './components/VoiceprintCanvas';
import {
  DisplayMode,
  RadiusMode,
  SideRenderMode,
  VoiceprintData,
  DeformationParams,
  RenderConfig,
  MirrorSessionSource,
} from './types';
import { globalSynth } from './utils/audioSynthesizer';
import {
  computeCumulativePhase,
  generateStandaloneSVGString,
  TrackLinePoints,
} from './utils/coordinateCalculators';
import { applyDeformations } from './utils/deformations';
import { generateDemoVoiceprint, validateAndParseVoiceprint } from './utils/generators';
import { mapPresetToMirrorState } from './presets/mapping';
import { loadBuiltInSampleDataset } from './presets/sampleDataset';
import type { MirrorPresetRecord } from './presets/types';
import { parseQuestionnairePresets } from './presets/questionnaireAdapter';
import { sanitizeFrequencyRange } from './utils/radiusMapping';
import { createDefaultTrackSelection, sanitizeTrackSelection } from './utils/trackSelection';
import {
  getContentStackClassName,
  getPageContainerClassName,
  getPageHeaderClassName,
  getStatusStripClassName,
  getWorkspaceViewportClassName,
} from '../../shared/ui/layout';

interface MirrorWorkspaceProps {
  initialVoiceprint?: VoiceprintData | null;
  sessionName?: string;
  source: MirrorSessionSource;
}

export function mergeMirrorPresetConfig(
  currentConfig: RenderConfig,
  presetPatch: Partial<RenderConfig>,
): RenderConfig {
  return {
    ...currentConfig,
    ...presetPatch,
    displayMode: currentConfig.displayMode,
    showGrid: currentConfig.showGrid,
  };
}

export function getNextPresetIndex(currentIndex: number, total: number, delta: number): number {
  if (total <= 0) {
    return -1;
  }

  return Math.max(0, Math.min(total - 1, currentIndex + delta));
}

export default function MirrorWorkspace({
  initialVoiceprint,
  sessionName,
  source,
}: MirrorWorkspaceProps) {
  const [voiceprint, setVoiceprint] = useState<VoiceprintData>(() => initialVoiceprint ?? generateDemoVoiceprint(4.0, 300));
  const [sessionSource, setSessionSource] = useState<MirrorSessionSource>(
    initialVoiceprint ? source : 'demo',
  );
  const [sessionTitle, setSessionTitle] = useState<string>(sessionName ?? '内置示例');
  const currentTrackPoints = useRef<TrackLinePoints[]>([]);

  const [config, setConfig] = useState<RenderConfig>({
    displayMode: DisplayMode.ENVELOPE,
    leftTrackIndices: createDefaultTrackSelection(initialVoiceprint?.tracks.length ?? 16, 12),
    rightTrackIndices: createDefaultTrackSelection(initialVoiceprint?.tracks.length ?? 16, 10),
    leftRenderMode: SideRenderMode.SEPARATE,
    rightRenderMode: SideRenderMode.MERGED,
    radiusMode: RadiusMode.ABSOLUTE_FREQUENCY,
    frequencyMin: 80,
    frequencyMax: 2000,
    radiusMin: 40,
    radiusMax: 400,
    energyInfluence: 1,
    amplitudeScale: 40,
    waveDensityMultiplier: 2,
    showGrid: true,
  });

  const [deformParams, setDeformParams] = useState<DeformationParams>({
    feedbackDecay: 0.45,
    foldThreshold: 0.55,
    ruminationFrequency: 5,
    ruminationStrength: 0.2,
  });

  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [presetRecords, setPresetRecords] = useState<MirrorPresetRecord[]>([]);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(-1);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [presetSourceLabel, setPresetSourceLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!initialVoiceprint) {
      return;
    }

    setVoiceprint(initialVoiceprint);
    setSessionSource(source);
    setSessionTitle(sessionName ?? '来自分析');
  }, [initialVoiceprint, sessionName, source]);

  const maxAvailableTracks = voiceprint.tracks.length;

  useEffect(() => {
    setConfig((prev) => {
      const safeRange = sanitizeFrequencyRange(prev.frequencyMin ?? 80, prev.frequencyMax ?? 2000);
      const leftTrackIndices = sanitizeTrackSelection(prev.leftTrackIndices, maxAvailableTracks);
      const rightTrackIndices = sanitizeTrackSelection(prev.rightTrackIndices, maxAvailableTracks);

      return {
        ...prev,
        radiusMode: prev.radiusMode ?? RadiusMode.ABSOLUTE_FREQUENCY,
        frequencyMin: safeRange.frequencyMin,
        frequencyMax: safeRange.frequencyMax,
        leftTrackIndices:
          leftTrackIndices.length > 0
            ? leftTrackIndices
            : createDefaultTrackSelection(maxAvailableTracks, Math.min(12, maxAvailableTracks)),
        rightTrackIndices:
          rightTrackIndices.length > 0
            ? rightTrackIndices
            : createDefaultTrackSelection(maxAvailableTracks, Math.min(10, maxAvailableTracks)),
      };
    });
  }, [maxAvailableTracks]);

  const deformedTracks = useMemo(() => {
    return applyDeformations(voiceprint.tracks, deformParams);
  }, [voiceprint, deformParams]);

  const cumulativePhase = useMemo(() => {
    return computeCumulativePhase(voiceprint);
  }, [voiceprint]);

  useEffect(() => {
    globalSynth.onTimeUpdate = (value: number) => {
      setPlaybackTime(value);
    };
    globalSynth.onPlaybackEnded = () => {
      setIsPlaying(false);
    };

    return () => {
      globalSynth.stop();
    };
  }, []);

  const handlePlayEnsemble = () => {
    globalSynth.playEnsemble(
      voiceprint,
      deformedTracks,
      config.leftTrackIndices,
      config.rightTrackIndices,
    );
    setIsPlaying(true);
  };

  const handleStopEnsemble = () => {
    globalSynth.stop();
    setIsPlaying(false);
  };

  const handleImportJSON = (fileObject: any) => {
    try {
      const parsed = validateAndParseVoiceprint(fileObject);
      setVoiceprint(parsed);
      setSessionSource('imported-json');
      setSessionTitle('导入 JSON');
      handleStopEnsemble();

      const available = parsed.tracks.length;
      setConfig((prev) => ({
        ...prev,
        leftTrackIndices: createDefaultTrackSelection(available, Math.min(prev.leftTrackIndices.length || 12, available)),
        rightTrackIndices: createDefaultTrackSelection(available, Math.min(prev.rightTrackIndices.length || 10, available)),
      }));
    } catch (error: any) {
      alert(`声纹加载失败: ${error.message}`);
    }
  };

  const applyPresetRecord = (record: MirrorPresetRecord, recordIndex: number) => {
    const presetState = mapPresetToMirrorState(record);
    handleStopEnsemble();
    setConfig((prev) => mergeMirrorPresetConfig(prev, presetState.renderConfigPatch));
    setDeformParams((prev) => ({
      ...prev,
      ...presetState.deformParamsPatch,
    }));
    setSelectedPresetIndex(recordIndex);
    setSelectedPresetId(record.id);
    setPresetSourceLabel(presetState.meta.presetLabel);
  };

  const handleApplyPreset = (presetId: string) => {
    const recordIndex = presetRecords.findIndex((item) => item.id === presetId);
    if (recordIndex < 0) {
      return;
    }

    applyPresetRecord(presetRecords[recordIndex], recordIndex);
  };

  const handleStepPreset = (delta: number) => {
    const nextIndex = getNextPresetIndex(selectedPresetIndex, presetRecords.length, delta);
    if (nextIndex < 0) {
      return;
    }

    applyPresetRecord(presetRecords[nextIndex], nextIndex);
  };

  const handleLoadBuiltInDataset = () => {
    const records = loadBuiltInSampleDataset();
    setPresetRecords(records);

    if (records[0]) {
      applyPresetRecord(records[0], 0);
    } else {
      setSelectedPresetIndex(-1);
      setSelectedPresetId(null);
      setPresetSourceLabel(null);
    }
  };

  const handleImportQuestionnaireJSON = (fileObject: unknown) => {
    try {
      const records = parseQuestionnairePresets(fileObject);
      setPresetRecords(records);

      if (records[0]) {
        applyPresetRecord(records[0], 0);
      } else {
        setSelectedPresetIndex(-1);
        setSelectedPresetId(null);
        setPresetSourceLabel(null);
      }
    } catch (error: any) {
      alert(`问卷预设加载失败: ${error.message}`);
    }
  };

  const handleCopySVG = () => {
    const svgCode = generateStandaloneSVGString(
      currentTrackPoints.current,
      550,
      550,
      config.radiusMax,
    );
    navigator.clipboard.writeText(svgCode);
  };

  const handleSyncPointsForExport = (points: TrackLinePoints[]) => {
    currentTrackPoints.current = points;
  };

  const sourceLabel =
    sessionSource === 'analyzer-job'
      ? '来自分析的单条结果'
      : sessionSource === 'imported-json'
        ? '导入 JSON'
        : '内置示例';

  return (
    <div
      className={`${getWorkspaceViewportClassName()} selection:bg-white selection:text-black`}
      style={{ fontSize: 'var(--text-ui)', fontWeight: 400 }}
    >
      <div className={getPageContainerClassName()}>
        <header className={getPageHeaderClassName()}>
          <div className={getContentStackClassName()}>
            <h1 className="text-white" style={{ fontSize: 'var(--text-title)', lineHeight: 1.15 }}>
              镜像
            </h1>
            <div style={{ fontSize: 'var(--text-ui)', color: 'rgba(255,255,255,0.65)' }}>
              调整单条结果的形态、试听与输出。
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {sessionSource === 'analyzer-job' && (
              <Link
                to="/analyzer"
                className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-[#050505] px-3 py-1 text-white/60 transition-colors hover:border-white/30 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                返回分析
              </Link>
            )}
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-[#050505] px-3 py-1 text-white/60 transition-colors hover:border-white/30 hover:text-white"
            >
              说明
            </button>
          </div>
        </header>

        <div className={getStatusStripClassName()}>
          <span className="text-white/40">来源</span>
          <span className="text-white">{sourceLabel}</span>
          {presetSourceLabel && (
            <>
              <span className="text-white/30">/</span>
              <span className="text-white/40">问卷预设</span>
              <span className="text-white">{presetSourceLabel}</span>
            </>
          )}
          <span className="text-white/30">/</span>
          <span className="text-white/40">时长</span>
          <span className="text-white" style={{ fontFamily: 'var(--font-mono)' }}>
            {voiceprint.duration.toFixed(2)}s
          </span>
          <span className="text-white/30">/</span>
          <span className="text-white/40">帧数</span>
          <span className="text-white" style={{ fontFamily: 'var(--font-mono)' }}>
            {voiceprint.sampleCount}
          </span>
          <span className="text-white/30">/</span>
          <span className="text-white/40">基频范围</span>
          <span className="text-white" style={{ fontFamily: 'var(--font-mono)' }}>
            {Math.min(...voiceprint.f0).toFixed(1)}Hz ~ {Math.max(...voiceprint.f0).toFixed(1)}Hz
          </span>
        </div>

        <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden lg:overflow-hidden lg:flex-row">
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <VoiceprintCanvas
              data={voiceprint}
              deformedTracks={deformedTracks}
              config={config}
              cumulativePhase={cumulativePhase}
              playbackTime={playbackTime}
              onExportPoints={handleSyncPointsForExport}
            />
          </div>

          <FloatingControls
            config={config}
            onChangeConfig={setConfig}
            deformParams={deformParams}
            onChangeDeformParams={setDeformParams}
            onImportJSON={handleImportJSON}
            onImportQuestionnaireJSON={handleImportQuestionnaireJSON}
            onLoadBuiltInDataset={handleLoadBuiltInDataset}
            presetRecords={presetRecords}
            selectedPresetIndex={selectedPresetIndex}
            selectedPresetId={selectedPresetId}
            onApplyPreset={handleApplyPreset}
            onStepPreset={handleStepPreset}
            onCopySVG={handleCopySVG}
            onPlayEnsemble={handlePlayEnsemble}
            onStopEnsemble={handleStopEnsemble}
            isPlaying={isPlaying}
            maxAvailableTracks={maxAvailableTracks}
            allowImport={sessionSource !== 'analyzer-job'}
          />
        </main>
      </div>

      {showExplanation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setShowExplanation(false)}
        >
          <div
            className="max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded border border-white/10 bg-[#050505] p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-1.5 text-white">
                镜像说明
              </div>
              <button
                onClick={() => setShowExplanation(false)}
                className="cursor-pointer text-white/40 hover:text-white"
              >
                关闭
              </button>
            </div>

            <div className="space-y-3 text-white/75" style={{ lineHeight: 1.6 }}>
              <div>
                <div className="mb-1 text-white" style={{ fontWeight: 400 }}>
                  用途
                </div>
                <p>
                  左侧显示原始声纹，右侧显示形变后的结果。这里用于对单条结果进行细调、试听，并导出为{' '}
                  <span style={{ fontFamily: 'var(--font-mono)' }}>SVG</span>。
                </p>
              </div>
              <div>
                <div className="mb-1 text-white" style={{ fontWeight: 400 }}>
                  从分析进入
                </div>
                <p>
                  如果从分析页打开，将自动载入该条结果；也可以在此处直接导入{' '}
                  <span style={{ fontFamily: 'var(--font-mono)' }}>JSON</span>。
                </p>
              </div>
              <div>
                <div className="mb-1 text-white" style={{ fontWeight: 400 }}>
                  输出
                </div>
                <p>
                  复制{' '}
                  <span style={{ fontFamily: 'var(--font-mono)' }}>SVG</span> 后可粘贴到矢量编辑器继续排版与加工。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
