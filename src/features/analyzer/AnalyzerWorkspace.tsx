import { useEffect, useMemo, useRef, useState } from 'react';
import { Settings } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAnalyzerRepository } from '../../app/providers/AnalyzerRepositoryProvider';
import AnalyzerDetailHeader from './components/AnalyzerDetailHeader';
import AnalyzerJobList from './components/AnalyzerJobList';
import AcousticCanvas from './components/AcousticCanvas';
import AudioUploader from './components/AudioUploader';
import Recorder from './components/Recorder';
import TrackList from './components/TrackList';
import { synthesizeAdditiveSynthesizer } from './utils/dsp';
import { createAnalyzerJobRunner } from './utils/analyzerJobRunner';
import { VoiceprintData } from '../voiceprint/types';
import { DEFAULT_TARGET_RMS, normalizeAudioSamples, normalizeAudioSamplesByRobustPeak } from '../../shared/audio/normalization';
import {
  getContentStackClassName,
  getPageContainerClassName,
  getPageHeaderClassName,
  getPanelClassName,
  getStatusStripClassName,
  getScrollableColumnClassName,
  getWorkspaceViewportClassName,
} from '../../shared/ui/layout';

function downloadVoiceprint(name: string, payload: VoiceprintData) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const element = document.createElement('a');
  element.href = url;
  element.download = `${name.replace(/\.[^/.]+$/, '')}_声学特征重构包.json`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(url);
}

export default function AnalyzerWorkspace() {
  const navigate = useNavigate();
  const params = useParams();
  const {
    jobs,
    selectedJob,
    selectedJobId,
    enqueueJob,
    updateJob,
    selectJob,
    exportableJobs,
  } = useAnalyzerRepository();

  const [numHarmonics, setNumHarmonics] = useState<number>(7);
  const [displayMode, setDisplayMode] = useState<'components' | 'additive' | 'both'>('both');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sourceType, setSourceType] = useState<'upload' | 'mic'>('upload');
  const [isPlayingOriginal, setIsPlayingOriginal] = useState<boolean>(false);
  const [isPlayingSynthesized, setIsPlayingSynthesized] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [normalizePlayback, setNormalizePlayback] = useState<boolean>(true);
  const [volumeProcessingMode, setVolumeProcessingMode] = useState<'off' | 'robust-peak'>('off');

  const audioContextRef = useRef<AudioContext | null>(null);
  const originalSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const synthesizedSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const jobRunnerRef = useRef<ReturnType<typeof createAnalyzerJobRunner> | null>(null);

  const analysis = selectedJob?.analysis ?? null;
  const selectedTracks = selectedJob?.selectedTracks ?? [];
  const processingJob = jobs.find((job) => job.status === 'processing');
  const queuedJob = jobs.find((job) => job.status === 'queued');
  const readyCount = exportableJobs.length;

  useEffect(() => {
    if (!params.itemId) {
      return;
    }

    selectJob(params.itemId);
  }, [params.itemId, selectJob]);

  useEffect(() => {
    if (selectedJobId && params.itemId !== selectedJobId) {
      navigate(`/analyzer/${selectedJobId}`, { replace: true });
    }
  }, [navigate, params.itemId, selectedJobId]);

  useEffect(() => {
    if (!queuedJob || processingJob) {
      setIsLoading(Boolean(processingJob));
      return;
    }

    if (!jobRunnerRef.current) {
      jobRunnerRef.current = createAnalyzerJobRunner({ updateJob, setIsLoading });
    }

    jobRunnerRef.current.start(queuedJob, { numHarmonics });
  }, [numHarmonics, processingJob, queuedJob, updateJob]);

  useEffect(() => {
    return () => {
      jobRunnerRef.current?.cancel();
    };
  }, []);

  useEffect(() => {
    let animationFrameId = 0;

    const tick = () => {
      const isPlaying = isPlayingOriginal || isPlayingSynthesized;
      if (isPlaying && audioContextRef.current && analysis) {
        const elapsed = audioContextRef.current.currentTime - playbackStartTimeRef.current;
        if (elapsed <= analysis.duration) {
          setCurrentTime(elapsed);
          animationFrameId = requestAnimationFrame(tick);
        } else {
          stopAllPlayback();
        }
      }
    };

    if (isPlayingOriginal || isPlayingSynthesized) {
      animationFrameId = requestAnimationFrame(tick);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [analysis, isPlayingOriginal, isPlayingSynthesized]);

  useEffect(() => () => {
    stopAllPlayback();
    audioContextRef.current?.close();
  }, []);

  useEffect(() => {
    stopAllPlayback();
  }, [selectedJobId]);

  const summary = useMemo(() => {
    return {
      total: jobs.length,
      queued: jobs.filter((job) => job.status === 'queued').length,
      processing: jobs.filter((job) => job.status === 'processing').length,
      ready: jobs.filter((job) => job.status === 'ready').length,
    };
  }, [jobs]);

  const getAudioContext = (): AudioContext => {
    if (!audioContextRef.current) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtxClass();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const stopAllPlayback = () => {
    if (originalSourceRef.current) {
      try {
        originalSourceRef.current.stop();
      } catch {}
      originalSourceRef.current = null;
    }
    if (synthesizedSourceRef.current) {
      try {
        synthesizedSourceRef.current.stop();
      } catch {}
      synthesizedSourceRef.current = null;
    }
    setIsPlayingOriginal(false);
    setIsPlayingSynthesized(false);
    setCurrentTime(0);
  };

  const handleNewAudioLoaded = (
    audioData: Float32Array,
    sampleRate: number,
    fileName: string,
    origin: 'upload' | 'mic' = sourceType,
  ) => {
    const processedAudio =
      volumeProcessingMode === 'robust-peak'
        ? normalizeAudioSamplesByRobustPeak(audioData)
        : audioData;
    enqueueJob({ audioData: processedAudio, sampleRate, fileName, sourceType: origin });
  };

  const handleToggleTrack = (idx: number) => {
    if (!selectedJob) {
      return;
    }
    updateJob(selectedJob.id, (job) => {
      const next = [...job.selectedTracks];
      if (idx >= 0 && idx < next.length) {
        next[idx] = !next[idx];
      }
      return { ...job, selectedTracks: next };
    });
    stopAllPlayback();
  };

  const handleSelectAll = () => {
    if (!analysis || !selectedJob) {
      return;
    }
    updateJob(selectedJob.id, (job) => ({
      ...job,
      selectedTracks: new Array(analysis.harmonics.length).fill(true),
    }));
    stopAllPlayback();
  };

  const handleClearAll = () => {
    if (!analysis || !selectedJob) {
      return;
    }
    updateJob(selectedJob.id, (job) => ({
      ...job,
      selectedTracks: new Array(analysis.harmonics.length).fill(false),
    }));
    stopAllPlayback();
  };

  const handlePlayOriginal = () => {
    if (!analysis) {
      return;
    }

    stopAllPlayback();

    try {
      const ctx = getAudioContext();
      const buffer = ctx.createBuffer(1, analysis.audioData.length, analysis.sampleRate);
      const originalAudio = normalizePlayback
        ? normalizeAudioSamples(analysis.audioData, { targetRms: DEFAULT_TARGET_RMS })
        : analysis.audioData;
      buffer.copyToChannel(originalAudio, 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gain = ctx.createGain();
      gain.gain.value = 0.8;

      source.connect(gain);
      gain.connect(ctx.destination);

      originalSourceRef.current = source;
      playbackStartTimeRef.current = ctx.currentTime;
      setIsPlayingOriginal(true);

      source.onended = () => setIsPlayingOriginal(false);
      source.start(0);
    } catch (error) {
      console.error(error);
      alert('请在浏览器内允许启用音频输出端口。');
    }
  };

  const handlePlaySynthesized = () => {
    if (!analysis) {
      return;
    }

    stopAllPlayback();

    try {
      const ctx = getAudioContext();
      const synthFloats = synthesizeAdditiveSynthesizer(
        analysis,
        selectedTracks,
        {
          sampleRate: analysis.sampleRate,
          targetRms: normalizePlayback ? DEFAULT_TARGET_RMS : undefined,
        },
      );
      const buffer = ctx.createBuffer(1, synthFloats.length, analysis.sampleRate);
      buffer.copyToChannel(synthFloats, 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gain = ctx.createGain();
      gain.gain.value = 0.85;

      source.connect(gain);
      gain.connect(ctx.destination);

      synthesizedSourceRef.current = source;
      playbackStartTimeRef.current = ctx.currentTime;
      setIsPlayingSynthesized(true);

      source.onended = () => setIsPlayingSynthesized(false);
      source.start(0);
    } catch (error) {
      console.error(error);
      alert('音频输出发生错误。');
    }
  };

  const handleExportCurrent = () => {
    if (!selectedJob?.voiceprint) {
      return;
    }
    downloadVoiceprint(selectedJob.sourceName, selectedJob.voiceprint);
  };

  const handleExportAll = () => {
    exportableJobs.forEach((job, index) => {
      if (!job.voiceprint) {
        return;
      }

      window.setTimeout(() => {
        downloadVoiceprint(job.sourceName, job.voiceprint as VoiceprintData);
      }, index * 120);
    });
  };

  return (
    <div
      className={`${getWorkspaceViewportClassName()} antialiased selection:bg-white selection:text-black`}
      style={{ fontSize: 'var(--text-ui)' }}
    >
      <div className={getPageContainerClassName()}>
        <header className={getPageHeaderClassName()}>
          <div className={getContentStackClassName()}>
            <h1 className="text-white" style={{ fontSize: 'var(--text-title)', lineHeight: 1.15 }}>
              分析
            </h1>
            <p className="text-white/60">导入声音，生成可继续试听与导出的结果。</p>
          </div>
        </header>

        <div className={getStatusStripClassName()}>
          <span className="text-white/40">总数</span>
          <span className="text-white" style={{ fontFamily: 'var(--font-mono)' }}>
            {summary.total}
          </span>
          <span className="text-white/30">/</span>
          <span className="text-white/40">排队</span>
          <span className="text-white" style={{ fontFamily: 'var(--font-mono)' }}>
            {summary.queued}
          </span>
          <span className="text-white/30">/</span>
          <span className="text-white/40">处理中</span>
          <span className="text-white" style={{ fontFamily: 'var(--font-mono)' }}>
            {summary.processing}
          </span>
          <span className="text-white/30">/</span>
          <span className="text-white/40">可导出</span>
          <span className="text-white" style={{ fontFamily: 'var(--font-mono)' }}>
            {summary.ready}
          </span>
        </div>

        <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[280px_minmax(0,1fr)_320px] 2xl:grid-cols-[300px_minmax(0,1fr)_340px]">
          <div className={getScrollableColumnClassName()}>
            <AnalyzerJobList jobs={jobs} selectedJobId={selectedJobId} onSelectJob={selectJob} />

            <div className={getPanelClassName()}>
              <div className="flex items-center justify-between">
                <span className="text-white">输入</span>
              </div>

              <div className="grid grid-cols-2 rounded border border-white/10 bg-black p-0.5">
                <button
                  onClick={() => setSourceType('upload')}
                  className={`py-1.5 transition ${
                    sourceType === 'upload'
                      ? 'rounded bg-white text-black'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  导入文件
                </button>
                <button
                  onClick={() => setSourceType('mic')}
                  disabled={isPlayingOriginal || isPlayingSynthesized}
                  className={`py-1.5 transition ${
                    sourceType === 'mic'
                      ? 'rounded bg-white text-black'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  麦克风录音
                </button>
              </div>

              {sourceType === 'upload' ? (
                <AudioUploader
                  onAudioLoaded={(audioData, sampleRate, fileName) =>
                    handleNewAudioLoaded(audioData, sampleRate, fileName, 'upload')
                  }
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                />
              ) : (
                <Recorder
                  onAudioRecorded={(audioData, sampleRate, fileName) =>
                    handleNewAudioLoaded(audioData, sampleRate, fileName, 'mic')
                  }
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                />
              )}
            </div>

            <div className={getPanelClassName()}>
              <div className="flex items-center justify-between">
                <span className="text-white">参数</span>
                <Settings className="h-4 w-4 text-white/40" />
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/60">N</span>
                  <span
                    className="rounded-sm border border-white/10 bg-black px-2 py-0.5 text-white"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {numHarmonics}
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={7}
                  step={1}
                  value={numHarmonics}
                  onChange={(event) => setNumHarmonics(parseInt(event.target.value, 10))}
                  className="h-1 w-full cursor-pointer rounded-lg bg-white/10 accent-white"
                />
                <div className="flex justify-between text-white/30">
                  <span style={{ fontFamily: 'var(--font-mono)' }}>2</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>7</span>
                </div>

                <label className="flex items-center justify-between rounded border border-white/5 bg-black px-3 py-2">
                  <span className="text-white/60">试听音量均一化</span>
                  <input
                    type="checkbox"
                    checked={normalizePlayback}
                    onChange={(event) => setNormalizePlayback(event.target.checked)}
                    className="h-4 w-4 cursor-pointer border border-white/10 bg-black accent-white"
                  />
                </label>

                <div className="flex flex-col gap-2 rounded border border-white/5 bg-black px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/60">导入音量处理</span>
                    <span className="text-white/30" style={{ fontFamily: 'var(--font-mono)' }}>
                      {volumeProcessingMode === 'robust-peak' ? 'ROBUST_PEAK' : 'OFF'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 rounded border border-white/10 bg-black p-0.5">
                    <button
                      type="button"
                      onClick={() => setVolumeProcessingMode('off')}
                      className={`py-1.5 transition ${
                        volumeProcessingMode === 'off'
                          ? 'rounded bg-white text-black'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      关闭
                    </button>
                    <button
                      type="button"
                      onClick={() => setVolumeProcessingMode('robust-peak')}
                      className={`py-1.5 transition ${
                        volumeProcessingMode === 'robust-peak'
                          ? 'rounded bg-white text-black'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      对齐峰值
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className={getPanelClassName()}>
              <div className="text-white/60">原理</div>
              <div
                className="flex flex-col gap-3 rounded border border-white/5 bg-black p-3 text-white/40"
                style={{ lineHeight: 1.6 }}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-white/60">1）中心剪裁</span>
                  <span>削弱共振峰包络，让自相关更稳定地捕捉语音周期。</span>
                </div>
                <div className="flex flex-col gap-1 border-t border-white/5 pt-3">
                  <span className="text-white/60">2）自相关 F0 追踪</span>
                  <span>在 80~500Hz 人声区间内估计每帧基频，并平滑孤立跳点。</span>
                </div>
                <div className="flex flex-col gap-1 border-t border-white/5 pt-3">
                  <span className="text-white/60">3）谐波提取与加性合成</span>
                  <span>以 F0 为基准建立 1+N 条轨道，供可视化、试听和镜像模块继续消费。</span>
                </div>
              </div>
            </div>
          </div>

          <div className={getScrollableColumnClassName()}>
            <AnalyzerDetailHeader
              job={selectedJob}
              readyCount={readyCount}
              onExportCurrent={handleExportCurrent}
              onExportAll={handleExportAll}
            />

            <div className={getPanelClassName()}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-white">波形</span>
                </div>

                <div className="flex gap-1 rounded border border-white/10 bg-black p-1">
                  <button
                    onClick={() => setDisplayMode('components')}
                    className={`rounded px-2.5 py-1 transition ${
                      displayMode === 'components'
                        ? 'bg-white text-black'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    分量图
                  </button>
                  <button
                    onClick={() => setDisplayMode('additive')}
                    className={`rounded px-2.5 py-1 transition ${
                      displayMode === 'additive'
                        ? 'bg-white text-black'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    叠加波
                  </button>
                  <button
                    onClick={() => setDisplayMode('both')}
                    className={`rounded px-2.5 py-1 transition ${
                      displayMode === 'both'
                        ? 'bg-white text-black'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    混合图
                  </button>
                </div>
              </div>

              <div className="h-[clamp(320px,44dvh,460px)] xl:h-[460px]">
                <AcousticCanvas
                  analysis={analysis}
                  selectedTracks={selectedTracks}
                  displayMode={displayMode}
                  currentTime={currentTime}
                />
              </div>
            </div>
          </div>

          <div className={getScrollableColumnClassName()}>
            <TrackList
              tracks={analysis ? analysis.harmonics : []}
              selectedTracks={selectedTracks}
              onToggleTrack={handleToggleTrack}
              onSelectAll={handleSelectAll}
              onClearAll={handleClearAll}
              isOriginalPlaying={isPlayingOriginal}
              isSynthesizedPlaying={isPlayingSynthesized}
              onPlayOriginal={handlePlayOriginal}
              onPlaySynthesized={handlePlaySynthesized}
              onStopPlayback={stopAllPlayback}
              hasAudio={!!analysis}
            />

            <div className={getPanelClassName()}>
              <span className="text-white">摘要</span>

              {analysis && selectedJob ? (
                <div className="flex flex-col gap-2.5 rounded border border-white/5 bg-black p-3 text-white/50">
                  <div className="flex justify-between gap-3">
                    <span>主音频源:</span>
                    <span className="max-w-[160px] truncate text-right text-white">{selectedJob.sourceName}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2">
                    <span>帧数:</span>
                    <span className="text-white" style={{ fontFamily: 'var(--font-mono)' }}>
                      {analysis.frameCount}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2">
                    <span>时宽:</span>
                    <span className="text-white" style={{ fontFamily: 'var(--font-mono)' }}>
                      {analysis.duration.toFixed(2)}s
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2">
                    <span>轨数:</span>
                    <span className="text-white" style={{ fontFamily: 'var(--font-mono)' }}>
                      {analysis.harmonics.length}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2">
                    <span>镜像联动:</span>
                    <span className="text-white">{selectedJob.voiceprint ? '已就绪' : '待生成'}</span>
                  </div>
                </div>
              ) : (
                <div className="rounded border border-dashed border-white/5 px-6 py-8 text-center text-white/30">
                  从左侧选择一个任务以查看详细分析。
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
