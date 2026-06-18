import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import { FloatingControls } from './components/FloatingControls';
import { VoiceprintCanvas } from './components/VoiceprintCanvas';
import { DisplayMode, VoiceprintData, DeformationParams, RenderConfig, MirrorSessionSource } from './types';
import { globalSynth } from './utils/audioSynthesizer';
import {
  computeCumulativePhase,
  generateStandaloneSVGString,
  TrackLinePoints,
} from './utils/coordinateCalculators';
import { applyDeformations } from './utils/deformations';
import { generateDemoVoiceprint, validateAndParseVoiceprint } from './utils/generators';
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
    displayMode: DisplayMode.WAVEFORM,
    nLeft: 12,
    nRight: 10,
    radiusMin: 60,
    radiusMax: 200,
    energyInfluence: 0.35,
    amplitudeScale: 32,
    waveDensityMultiplier: 1.25,
    showGrid: true,
  });

  const [deformParams, setDeformParams] = useState<DeformationParams>({
    feedbackDecay: 0.4,
    foldThreshold: 0.65,
    ruminationFrequency: 2.8,
    ruminationStrength: 0.12,
  });

  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  useEffect(() => {
    if (!initialVoiceprint) {
      return;
    }

    setVoiceprint(initialVoiceprint);
    setSessionSource(source);
    setSessionTitle(sessionName ?? '来自分析');
  }, [initialVoiceprint, sessionName, source]);

  const maxAvailableTracks = voiceprint.tracks.length;

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
    globalSynth.playEnsemble(voiceprint, deformedTracks, config.nLeft, config.nRight);
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
        nLeft: Math.min(prev.nLeft, available),
        nRight: Math.min(prev.nRight, available),
      }));
    } catch (error: any) {
      alert(`声纹加载失败: ${error.message}`);
    }
  };

  const handleCopySVG = () => {
    const svgCode = generateStandaloneSVGString(currentTrackPoints.current, 550, 550);
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
