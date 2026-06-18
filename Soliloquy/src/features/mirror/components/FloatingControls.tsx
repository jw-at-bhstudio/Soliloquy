/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import { FolderOpen, Play, Square, Copy, Zap } from "lucide-react";
import { RenderConfig, DeformationParams, DisplayMode } from "../types";
import { generateDemoVoiceprint } from "../utils/generators";

interface FloatingControlsProps {
  config: RenderConfig;
  onChangeConfig: (newConfig: RenderConfig) => void;
  deformParams: DeformationParams;
  onChangeDeformParams: (newParams: DeformationParams) => void;
  onImportJSON: (data: any) => void;
  onCopySVG: () => void;
  onPlayEnsemble: () => void;
  onStopEnsemble: () => void;
  isPlaying: boolean;
  maxAvailableTracks: number;
  allowImport?: boolean;
}

export function FloatingControls({
  config,
  onChangeConfig,
  deformParams,
  onChangeDeformParams,
  onImportJSON,
  onCopySVG,
  onPlayEnsemble,
  onStopEnsemble,
  isPlaying,
  maxAvailableTracks,
  allowImport = true,
}: FloatingControlsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  const handleDownloadSample = () => {
    const sample = generateDemoVoiceprint(4.0, 120);
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "镜像示例.json";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const parseAndImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onImportJSON(json);
      } catch (error: any) {
        alert(`导入失败: ${error.message || "无效的 JSON 格式"}`);
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      parseAndImportFile(files[0]);
    }
  };

  const handleDrag = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true);
      return;
    }
    setDragActive(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      parseAndImportFile(event.dataTransfer.files[0]);
    }
  };

  const handleCopyTrigger = () => {
    onCopySVG();
    setCopiedNotification(true);
    setTimeout(() => {
      setCopiedNotification(false);
    }, 2000);
  };

  return (
    <div
      className="flex w-full shrink-0 select-none flex-col overflow-y-auto rounded border border-white/10 bg-[#050505]/95 p-4 text-white lg:h-full lg:min-h-0 lg:w-[360px] xl:w-[380px]"
      id="control-dock-panel"
      style={{ fontSize: "var(--text-ui)", fontWeight: 400 }}
    >
      {allowImport && (
        <section
          className="mb-5 rounded border border-white/10 bg-white/[0.03] p-3"
          id="control-group-import"
        >
          <div className="mb-2 text-white/70" style={{ fontWeight: 400 }}>
            数据
          </div>
          <div className="mb-2 text-white/35" style={{ fontWeight: 400 }}>
            导入与示例
          </div>

          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded border border-dashed p-4 text-center transition-colors ${
              dragActive
                ? "border-white bg-white/[0.06] text-white"
                : "border-white/10 bg-black text-white/55 hover:border-white/30 hover:bg-white/[0.03] hover:text-white/80"
            }`}
            id="dropzone-area"
          >
            <FolderOpen className="h-5 w-5" />
            <div>
              导入 <span style={{ fontFamily: "var(--font-mono)" }}>JSON</span>
            </div>
            <div className="text-white/35">点击或拖拽文件</div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
              id="json-file-picker"
            />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-white/35">没有数据？</span>
            <button
              onClick={handleDownloadSample}
              className="cursor-pointer text-white/55 underline transition-colors hover:text-white"
              id="btn-sample-download"
            >
              下载示例 <span style={{ fontFamily: "var(--font-mono)" }}>JSON</span>
            </button>
          </div>
        </section>
      )}

      <section className="mb-5 rounded border border-white/10 bg-white/[0.02] p-3" id="control-group-mirror-params">
        <div className="mb-4 flex items-center gap-2 text-white" style={{ fontWeight: 400 }}>
          <Zap className="h-4 w-4 text-white" />
          镜像参数
        </div>

        <div className="mb-5" id="sec-channel-harmonics">
          <div className="mb-3 text-white/70" style={{ fontWeight: 400 }}>
            轨道
          </div>

          <div className="mb-3">
            <div className="mb-1 flex justify-between">
              <span className="text-white/75">左侧轨道数</span>
              <span className="text-white" style={{ fontFamily: "var(--font-mono)" }}>
                {config.nLeft} / {maxAvailableTracks}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max={maxAvailableTracks}
              step="1"
              value={config.nLeft}
              onChange={(event) => onChangeConfig({ ...config, nLeft: parseInt(event.target.value) })}
              className="h-1 w-full cursor-pointer rounded bg-stone-800 accent-white"
              id="slider-n-left"
            />
            <span className="mt-0.5 block text-white/35">左侧绘制的轨道数量</span>
          </div>

          <div>
            <div className="mb-1 flex justify-between">
              <span className="text-white/75">右侧轨道数</span>
              <span className="text-white" style={{ fontFamily: "var(--font-mono)" }}>
                {config.nRight} / {maxAvailableTracks}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max={maxAvailableTracks}
              step="1"
              value={config.nRight}
              onChange={(event) => onChangeConfig({ ...config, nRight: parseInt(event.target.value) })}
              className="h-1 w-full cursor-pointer rounded bg-stone-800 accent-white"
              id="slider-n-right"
            />
            <span className="mt-0.5 block text-white/35">右侧绘制的轨道数量</span>
          </div>
        </div>

        <div className="mb-5 rounded border border-white/10 bg-black/30 p-3" id="sec-rumination-distortion">
          <div className="mb-3 text-white/70" style={{ fontWeight: 400 }}>
            形变
          </div>

          <div className="mb-3.5">
            <div className="mb-1 flex justify-between">
              <span className="text-stone-300">反馈残留</span>
              <span className="text-white" style={{ fontFamily: "var(--font-mono)" }}>
                {(deformParams.feedbackDecay * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="0.9"
              step="0.01"
              value={deformParams.feedbackDecay}
              onChange={(event) =>
                onChangeDeformParams({ ...deformParams, feedbackDecay: parseFloat(event.target.value) })
              }
              className="h-1 w-full cursor-pointer rounded bg-stone-800 accent-white"
              id="slider-feedback"
            />
            <span className="mt-0.5 block text-stone-500">控制残留的衰减速度</span>
          </div>

          <div className="mb-3.5">
            <div className="mb-1 flex justify-between">
              <span className="text-stone-300">折叠阈值</span>
              <span className="text-white" style={{ fontFamily: "var(--font-mono)" }}>
                {deformParams.foldThreshold.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.01"
              value={deformParams.foldThreshold}
              onChange={(event) =>
                onChangeDeformParams({ ...deformParams, foldThreshold: parseFloat(event.target.value) })
              }
              className="h-1 w-full cursor-pointer rounded bg-stone-800 accent-white"
              id="slider-folding"
            />
            <span className="mt-0.5 block text-stone-500">超限部分将折返形成更强的谐波</span>
          </div>

          <div className="mb-3.5">
            <div className="mb-1 flex justify-between">
              <span className="text-stone-300">调制频率</span>
              <span className="text-white" style={{ fontFamily: "var(--font-mono)" }}>
                {deformParams.ruminationFrequency.toFixed(1)}Hz
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={deformParams.ruminationFrequency}
              onChange={(event) =>
                onChangeDeformParams({ ...deformParams, ruminationFrequency: parseFloat(event.target.value) })
              }
              className="h-1 w-full cursor-pointer rounded bg-stone-800 accent-white"
              id="slider-r-freq"
            />
            <span className="mt-0.5 block text-stone-500">影响形变的周期变化速度</span>
          </div>

          <div>
            <div className="mb-1 flex justify-between">
              <span className="text-stone-300">调制强度</span>
              <span className="text-white" style={{ fontFamily: "var(--font-mono)" }}>
                {deformParams.ruminationStrength.toFixed(3)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="0.4"
              step="0.005"
              value={deformParams.ruminationStrength}
              onChange={(event) =>
                onChangeDeformParams({ ...deformParams, ruminationStrength: parseFloat(event.target.value) })
              }
              className="h-1 w-full cursor-pointer rounded bg-stone-800 accent-white"
              id="slider-r-amp"
            />
            <span className="mt-0.5 block text-stone-500">影响形变幅度</span>
          </div>
        </div>

        <div id="sec-orbital-rendering">
          <div className="mb-3 text-white/70" style={{ fontWeight: 400 }}>
            绘制
          </div>

          <div className="mb-3.5">
            <div className="mb-1.5 flex items-center justify-between text-stone-300">
              <span>绘制模式</span>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded border border-stone-800 bg-stone-950 p-1" id="segment-display-mode">
              <button
                onClick={() => onChangeConfig({ ...config, displayMode: DisplayMode.ENVELOPE })}
                className={`cursor-pointer rounded py-1.5 transition-colors ${
                  config.displayMode === DisplayMode.ENVELOPE
                    ? "bg-white text-black"
                    : "text-stone-400 hover:text-stone-200"
                }`}
                id="mode-envelope"
              >
                振幅包络
              </button>
              <button
                onClick={() => onChangeConfig({ ...config, displayMode: DisplayMode.WAVEFORM })}
                className={`cursor-pointer rounded py-1.5 transition-colors ${
                  config.displayMode === DisplayMode.WAVEFORM
                    ? "bg-white text-black"
                    : "text-stone-400 hover:text-stone-200"
                }`}
                id="mode-waveform"
              >
                波形
              </button>
            </div>
          </div>

          <div className="mb-3.5">
            <div className="mb-1 flex justify-between">
              <span className="text-stone-300">自适应能量轨道排布</span>
              <span className="text-white" style={{ fontFamily: "var(--font-mono)" }}>
                {(config.energyInfluence * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1.0"
              step="0.05"
              value={config.energyInfluence}
              onChange={(event) =>
                onChangeConfig({ ...config, energyInfluence: parseFloat(event.target.value) })
              }
              className="h-1 w-full cursor-pointer rounded bg-stone-800 accent-white"
              id="slider-energy-influence"
            />
            <span className="mt-0.5 block text-stone-500">越强的轨道越向外扩散</span>
          </div>

          <div className="mb-3.5">
            <div className="mb-1 flex justify-between">
              <span className="text-stone-300">振幅比例</span>
              <span className="text-white" style={{ fontFamily: "var(--font-mono)" }}>
                {config.amplitudeScale.toFixed(1)}px
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="120"
              step="1"
              value={config.amplitudeScale}
              onChange={(event) => onChangeConfig({ ...config, amplitudeScale: parseInt(event.target.value) })}
              className="h-1 w-full cursor-pointer rounded bg-stone-800 accent-white"
              id="slider-amplitude-scale"
            />
            <span className="mt-0.5 block text-stone-500">控制波形幅度</span>
          </div>

          <div className="mb-3.5 grid grid-cols-2 gap-3" id="orbit-radius-inputs">
            <div>
              <span className="mb-1 block text-stone-400">半径下限</span>
              <input
                type="number"
                min="10"
                max="150"
                value={config.radiusMin}
                onChange={(event) =>
                  onChangeConfig({ ...config, radiusMin: Math.max(10, parseInt(event.target.value) || 10) })
                }
                className="w-full rounded border border-stone-800 bg-stone-950 px-2 py-1 text-white outline-none focus:border-stone-600"
                style={{ fontFamily: "var(--font-mono)" }}
                id="input-rmin"
              />
            </div>
            <div>
              <span className="mb-1 block text-stone-400">半径上限</span>
              <input
                type="number"
                min="100"
                max="400"
                value={config.radiusMax}
                onChange={(event) =>
                  onChangeConfig({ ...config, radiusMax: Math.max(100, parseInt(event.target.value) || 100) })
                }
                className="w-full rounded border border-stone-800 bg-stone-950 px-2 py-1 text-white outline-none focus:border-stone-600"
                style={{ fontFamily: "var(--font-mono)" }}
                id="input-rmax"
              />
            </div>
          </div>

          {config.displayMode === DisplayMode.WAVEFORM && (
            <div className="mb-3">
              <div className="mb-1 flex justify-between">
                <span className="text-stone-300">疏密</span>
                <span className="text-white" style={{ fontFamily: "var(--font-mono)" }}>
                  x{config.waveDensityMultiplier.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="4.0"
                step="0.05"
                value={config.waveDensityMultiplier}
                onChange={(event) =>
                  onChangeConfig({ ...config, waveDensityMultiplier: parseFloat(event.target.value) })
                }
                className="h-1 w-full cursor-pointer rounded bg-stone-800 accent-white"
                id="slider-density"
              />
              <span className="mt-0.5 block text-stone-500">控制波形的密度</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-stone-400">显示参考网格</span>
            <input
              type="checkbox"
              checked={config.showGrid}
              onChange={(event) => onChangeConfig({ ...config, showGrid: event.target.checked })}
              className="h-4 w-4 cursor-pointer border border-stone-800 bg-stone-950 accent-white"
              id="checkbox-grid-toggle"
            />
          </div>
        </div>
      </section>

      <section className="mt-auto border-t border-white/10 pt-4" id="control-group-actions">
        <div className="mb-3 text-white/70" style={{ fontWeight: 400 }}>
          试听与导出
        </div>
        <div className="mb-3 text-white/35" style={{ fontWeight: 400 }}>
          导出
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          {isPlaying ? (
            <button
              onClick={onStopEnsemble}
              className="col-span-2 flex cursor-pointer items-center justify-center gap-2 rounded bg-white py-3 text-black transition-colors hover:bg-stone-200"
              id="btn-trigger-stop"
            >
              <Square className="h-4 w-4 fill-black text-black" />
              停止试听
            </button>
          ) : (
            <button
              onClick={onPlayEnsemble}
              className="col-span-2 flex cursor-pointer items-center justify-center gap-2 rounded border border-white py-3 text-white transition-all duration-200 hover:bg-white hover:text-black"
              id="btn-trigger-play"
            >
              <Play className="h-4 w-4 fill-current" />
              开始试听
            </button>
          )}
        </div>

        <button
          onClick={handleCopyTrigger}
          className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded py-2.5 transition-all duration-300 ${
            copiedNotification
              ? "scale-[1.01] border border-green-500 bg-[#113a1a] text-green-300"
              : "border border-stone-800 bg-black text-stone-400 hover:bg-stone-900 hover:text-white"
          }`}
          id="btn-trigger-copy"
        >
          <Copy className="h-3.5 w-3.5" />
          {copiedNotification ? (
            <>
              已复制 <span style={{ fontFamily: "var(--font-mono)" }}>SVG</span>
            </>
          ) : (
            <>
              复制 <span style={{ fontFamily: "var(--font-mono)" }}>SVG</span>
            </>
          )}
        </button>

        <p className="mt-2 text-center text-stone-500" style={{ lineHeight: 1.6 }}>
          复制后可直接粘贴到矢量编辑器进行排版与加工。
        </p>
      </section>
    </div>
  );
}
