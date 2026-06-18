/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HarmonicTrack } from '../types';
import { Play, Square, Volume2, Info, Check } from 'lucide-react';
import { getContentStackClassName, getPanelClassName } from '../../../shared/ui/layout';

interface TrackListProps {
  tracks: HarmonicTrack[];
  selectedTracks: boolean[];
  onToggleTrack: (idx: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  
  // Audio playback delegates
  isOriginalPlaying: boolean;
  isSynthesizedPlaying: boolean;
  onPlayOriginal: () => void;
  onPlaySynthesized: () => void;
  onStopPlayback: () => void;
  hasAudio: boolean;
}

export default function TrackList({
  tracks,
  selectedTracks,
  onToggleTrack,
  onSelectAll,
  onClearAll,
  isOriginalPlaying,
  isSynthesizedPlaying,
  onPlayOriginal,
  onPlaySynthesized,
  onStopPlayback,
  hasAudio,
}: TrackListProps) {
  
  // Helper to calculate statistics for each harmonic track
  const getTrackStats = (track: HarmonicTrack) => {
    // Collect stats excluding silent F0 frames
    const activeFreqs = track.frequencies.filter(f => f > 0);
    const activeAmps = track.amplitudes.filter((_, idx) => track.frequencies[idx] > 0);

    const avgFreq = activeFreqs.length > 0 
      ? activeFreqs.reduce((a, b) => a + b, 0) / activeFreqs.length 
      : 0;
      
    const maxAmp = track.amplitudes.length > 0
      ? Math.max(...track.amplitudes)
      : 0;

    const avgAmp = activeAmps.length > 0
      ? activeAmps.reduce((a, b) => a + b, 0) / activeAmps.length
      : 0;

    return {
      avgFreq,
      maxAmp,
      avgAmp,
    };
  };

  return (
    <div id="harmonics-tracklist-container" className={getPanelClassName()} style={{ fontSize: 'var(--text-ui)' }}>
      <div className="flex items-center justify-between">
        <div className={getContentStackClassName()}>
          <span className="text-white">当前结果</span>
          <span className="text-white/40">选择轨道并试听原音或重构音。</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3" id="synthesis-player-board">
        <button
          onClick={isOriginalPlaying ? onStopPlayback : onPlayOriginal}
          disabled={!hasAudio}
          className={`flex items-center justify-center gap-2 rounded border px-3 py-2.5 transition-all duration-150 active:scale-95 ${
            isOriginalPlaying
              ? 'bg-white text-black border-white'
              : hasAudio
                ? 'border-white/20 text-white hover:border-white hover:bg-white/5'
                : 'border-white/5 text-white/20 cursor-not-allowed'
          }`}
        >
          {isOriginalPlaying ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>停止播放</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>播放原音</span>
            </>
          )}
        </button>

        <button
          onClick={isSynthesizedPlaying ? onStopPlayback : onPlaySynthesized}
          disabled={!hasAudio}
          className={`flex items-center justify-center gap-2 rounded border px-3 py-2.5 transition-all duration-150 active:scale-95 ${
            isSynthesizedPlaying
              ? 'bg-white text-black border-white'
              : hasAudio
                ? 'border-white/20 text-white hover:border-white hover:bg-white/5'
                : 'border-white/5 text-white/20 cursor-not-allowed'
          }`}
        >
          {isSynthesizedPlaying ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>停止播放</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5" />
              <span>播放重构音</span>
            </>
          )}
        </button>
      </div>

      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <span className="text-white/40">轨道列表</span>
        <div className="flex gap-2.5">
          <button
            onClick={onSelectAll}
            disabled={!hasAudio}
            className="text-white hover:underline transition duration-150 cursor-pointer disabled:text-white/25 disabled:no-underline"
          >
            全选
          </button>
          <span className="text-white/10">/</span>
          <button
            onClick={onClearAll}
            disabled={!hasAudio}
            className="text-white hover:underline transition duration-150 cursor-pointer disabled:text-white/25 disabled:no-underline"
          >
            全不选
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1" id="scrolling-track-holder">
        {hasAudio && tracks.length > 0 ? (
          tracks.map((track, i) => {
            const isChecked = selectedTracks[i] !== false;
            const { avgFreq, avgAmp, maxAmp } = getTrackStats(track);

            return (
              <div
                key={track.index}
                onClick={() => onToggleTrack(track.index)}
                className={`flex items-center justify-between p-2 rounded border transition-all duration-150 cursor-pointer active:scale-[0.99] select-none ${
                  isChecked
                    ? 'border-white bg-[#0f0f0f]'
                    : 'border-white/5 bg-[#020202] hover:border-white/20 hover:bg-[#070707]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 border flex items-center justify-center rounded transition duration-150 ${
                      isChecked
                        ? 'border-white bg-white text-black'
                        : 'border-white/20 bg-transparent text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-white flex items-center gap-1.5">
                      <span style={{ fontFamily: 'var(--font-mono)' }}>F{track.multiplier}</span>
                      <span>轨</span>
                      <span className="rounded-sm border border-white/10 bg-white/5 px-1 py-0.5 text-white/60">
                        {track.index === 0 ? (
                          <>
                            基频（<span style={{ fontFamily: 'var(--font-mono)' }}>F0</span>）
                          </>
                        ) : (
                          <>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>{track.multiplier}</span> 倍音
                          </>
                        )}
                      </span>
                    </span>
                    <span className="text-white/40">
                      倍频：<span style={{ fontFamily: 'var(--font-mono)' }}>{track.multiplier}x</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 text-right text-white/60">
                  <div>
                    <span className="text-white/30 mr-1">平均频率:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      {avgFreq > 0 ? `${avgFreq.toFixed(1)} Hz` : '---'}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/30 mr-1">最大波幅:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      {avgAmp > 0 ? maxAmp.toFixed(3) : '0.000'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-10 gap-2 border border-dashed border-white/5 rounded select-none">
            <Info className="w-4 h-4 text-white/20" />
            <span className="text-white/30">导入声音后，将在这里显示轨道结果。</span>
          </div>
        )}
      </div>
    </div>
  );
}
