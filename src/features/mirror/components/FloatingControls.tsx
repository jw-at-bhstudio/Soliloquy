/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { FolderOpen, Play, Square, Copy, Zap } from "lucide-react";
import { RenderConfig, DeformationParams, DisplayMode, SideRenderMode } from "../types";
import type { MirrorPresetRecord } from "../presets/types";
import { sanitizeFrequencyRange } from "../utils/radiusMapping";
import { createDefaultTrackSelection, sanitizeTrackSelection } from "../utils/trackSelection";
import { generateDemoVoiceprint } from "../utils/generators";

type RuminationControlKey =
  | "ruminationFrequency"
  | "feedbackDecay"
  | "ruminationStrength"
  | "foldThreshold";

type RuminationControlSpec = {
  key: RuminationControlKey;
  label: string;
  description: string;
  inputId: string;
  min: string;
  max: string;
  step: string;
  formatValue: (value: number) => string;
};

export const RUMINATION_CONTROL_SPECS: readonly RuminationControlSpec[] = [
  {
    key: "ruminationFrequency",
    label: "反复 / Recurrence",
    description: "影响反复回返的周期速度",
    inputId: "slider-r-freq",
    min: "0",
    max: "10",
    step: "0.1",
    formatValue: (value) => `${value.toFixed(1)}Hz`,
  },
  {
    key: "feedbackDecay",
    label: "残留 / Lingering",
    description: "影响残留拖尾的衰减速度",
    inputId: "slider-feedback",
    min: "0",
    max: "0.9",
    step: "0.01",
    formatValue: (value) => `${(value * 100).toFixed(0)}%`,
  },
  {
    key: "ruminationStrength",
    label: "扭曲 / Distortion",
    description: "影响时间扰动与形变强度",
    inputId: "slider-r-amp",
    min: "0",
    max: "0.4",
    step: "0.005",
    formatValue: (value) => value.toFixed(3),
  },
  {
    key: "foldThreshold",
    label: "折返 / Collapse",
    description: "超限部分将折返形成更强谐波",
    inputId: "slider-folding",
    min: "0.1",
    max: "1.0",
    step: "0.01",
    formatValue: (value) => value.toFixed(2),
  },
] as const;

export function getRuminationControlSpecs() {
  return RUMINATION_CONTROL_SPECS;
}

const MIRROR_INPUT_COPY = {
  voiceprintSectionTitle: "声纹输入",
  voiceprintSectionDescription: "载入当前要绘制的声纹骨架。",
  voiceprintImportButton: "导入声纹 JSON",
  voiceprintSampleButton: "下载声纹示例",
  questionnaireSectionTitle: "问卷映射",
  questionnaireSectionDescription: "载入问卷结果，并将其映射为当前声纹的参数配置。",
  questionnaireImportButton: "导入问卷结果 JSON",
  compareModeLabel: "比较模式",
  compareModeDescription: "在同一个声纹上快速切换不同问卷样本，比较可视化差异。",
  builtInDatasetButton: "载入 20 人比较样本",
  previousPresetButton: "上一份",
  nextPresetButton: "下一份",
} as const;

export function getMirrorInputCopy() {
  return MIRROR_INPUT_COPY;
}

interface FloatingControlsProps {
  config: RenderConfig;
  onChangeConfig: (newConfig: RenderConfig) => void;
  deformParams: DeformationParams;
  onChangeDeformParams: (newParams: DeformationParams) => void;
  onImportJSON: (data: any) => void;
  onImportQuestionnaireJSON: (data: unknown) => void;
  onLoadBuiltInDataset: () => void;
  presetRecords: MirrorPresetRecord[];
  selectedPresetIndex: number;
  selectedPresetId: string | null;
  onApplyPreset: (presetId: string) => void;
  onStepPreset: (delta: number) => void;
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
  onImportQuestionnaireJSON,
  onLoadBuiltInDataset,
  presetRecords,
  selectedPresetIndex,
  selectedPresetId,
  onApplyPreset,
  onStepPreset,
  onCopySVG,
  onPlayEnsemble,
  onStopEnsemble,
  isPlaying,
  maxAvailableTracks,
  allowImport = true,
}: FloatingControlsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const questionnaireFileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [frequencyMinInput, setFrequencyMinInput] = useState<string>(String(config.frequencyMin ?? 80));
  const [frequencyMaxInput, setFrequencyMaxInput] = useState<string>(String(config.frequencyMax ?? 2000));
  const [radiusMinInput, setRadiusMinInput] = useState<string>(String(config.radiusMin));
  const [radiusMaxInput, setRadiusMaxInput] = useState<string>(String(config.radiusMax));

  useEffect(() => {
    setFrequencyMinInput(String(config.frequencyMin ?? 80));
  }, [config.frequencyMin]);

  useEffect(() => {
    setFrequencyMaxInput(String(config.frequencyMax ?? 2000));
  }, [config.frequencyMax]);

  useEffect(() => {
    setRadiusMinInput(String(config.radiusMin));
  }, [config.radiusMin]);

  useEffect(() => {
    setRadiusMaxInput(String(config.radiusMax));
  }, [config.radiusMax]);

  const parseRawNumber = (rawValue: string, fallback: number) => {
    const parsed = Number.parseFloat(rawValue.trim());
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const toggleTrack = (side: "left" | "right", trackIndex: number) => {
    const currentSelection = side === "left" ? config.leftTrackIndices : config.rightTrackIndices;
    const nextSelection = currentSelection.includes(trackIndex)
      ? currentSelection.filter((index) => index !== trackIndex)
      : [...currentSelection, trackIndex];

    onChangeConfig({
      ...config,
      ...(side === "left"
        ? { leftTrackIndices: sanitizeTrackSelection(nextSelection, maxAvailableTracks) }
        : { rightTrackIndices: sanitizeTrackSelection(nextSelection, maxAvailableTracks) }),
    });
  };

  const setAllTracks = (side: "left" | "right", mode: "all" | "clear") => {
    onChangeConfig({
      ...config,
      ...(side === "left"
        ? {
            leftTrackIndices:
              mode === "all" ? createDefaultTrackSelection(maxAvailableTracks, maxAvailableTracks) : [],
          }
        : {
            rightTrackIndices:
              mode === "all" ? createDefaultTrackSelection(maxAvailableTracks, maxAvailableTracks) : [],
          }),
    });
  };

  const updateFrequencyRange = (nextMin: number, nextMax: number) => {
    const safeRange = sanitizeFrequencyRange(nextMin, nextMax);
    onChangeConfig({
      ...config,
      frequencyMin: safeRange.frequencyMin,
      frequencyMax: safeRange.frequencyMax,
    });
  };

  const commitFrequencyInputs = () => {
    const nextMin = parseRawNumber(frequencyMinInput, config.frequencyMin ?? 80);
    const nextMax = parseRawNumber(frequencyMaxInput, config.frequencyMax ?? 2000);
    const safeRange = sanitizeFrequencyRange(nextMin, nextMax);

    updateFrequencyRange(safeRange.frequencyMin, safeRange.frequencyMax);
    setFrequencyMinInput(String(safeRange.frequencyMin));
    setFrequencyMaxInput(String(safeRange.frequencyMax));
  };

  const commitRadiusInputs = () => {
    const nextMin = Math.max(10, Math.round(parseRawNumber(radiusMinInput, config.radiusMin)));
    const nextMax = Math.round(parseRawNumber(radiusMaxInput, config.radiusMax));
    const safeMax = Math.max(nextMin + 1, nextMax);

    onChangeConfig({
      ...config,
      radiusMin: nextMin,
      radiusMax: safeMax,
    });
    setRadiusMinInput(String(nextMin));
    setRadiusMaxInput(String(safeMax));
  };

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

  const parseAndImportFile = (file: File, onImport: (json: unknown) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onImport(json);
      } catch (error: any) {
        alert(`导入失败: ${error.message || "无效的 JSON 格式"}`);
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      parseAndImportFile(files[0], onImportJSON);
    }
  };

  const handleQuestionnaireFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      parseAndImportFile(files[0], onImportQuestionnaireJSON);
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
      parseAndImportFile(event.dataTransfer.files[0], onImportJSON);
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
            {MIRROR_INPUT_COPY.voiceprintSectionTitle}
          </div>
          <div className="mb-2 text-white/35" style={{ fontWeight: 400 }}>
            {MIRROR_INPUT_COPY.voiceprintSectionDescription}
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
              {MIRROR_INPUT_COPY.voiceprintImportButton}
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
              {MIRROR_INPUT_COPY.voiceprintSampleButton}
            </button>
          </div>
        </section>
      )}

      <section className="mb-5 rounded border border-white/10 bg-white/[0.03] p-3" id="control-group-questionnaire-presets">
        <div className="mb-2 text-white/70" style={{ fontWeight: 400 }}>
          {MIRROR_INPUT_COPY.questionnaireSectionTitle}
        </div>
        <div className="mb-2 text-white/35" style={{ fontWeight: 400 }}>
          {MIRROR_INPUT_COPY.questionnaireSectionDescription}
        </div>

        <button
          onClick={() => questionnaireFileInputRef.current?.click()}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded border border-white/10 bg-black px-3 py-2.5 text-white/70 transition-colors hover:border-white/30 hover:text-white"
          type="button"
        >
          <FolderOpen className="h-4 w-4" />
          {MIRROR_INPUT_COPY.questionnaireImportButton}
        </button>
        <input
          type="file"
          ref={questionnaireFileInputRef}
          onChange={handleQuestionnaireFileChange}
          accept=".json"
          className="hidden"
        />

        <div className="mt-3 text-white/35" style={{ fontWeight: 400 }}>
          {MIRROR_INPUT_COPY.compareModeLabel}
        </div>
        <div className="mt-1 text-white/25">
          {MIRROR_INPUT_COPY.compareModeDescription}
        </div>

        <button
          onClick={onLoadBuiltInDataset}
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded border border-white/10 bg-white/[0.03] px-3 py-2.5 text-white/70 transition-colors hover:border-white/30 hover:bg-white/[0.06] hover:text-white"
          type="button"
        >
          {MIRROR_INPUT_COPY.builtInDatasetButton}
        </button>

        <div className="mt-3 flex items-center justify-between text-white/35">
          <span>已载入 {presetRecords.length} 条</span>
          <span>单击条目即可应用</span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onStepPreset(-1)}
            disabled={selectedPresetIndex <= 0}
            className="rounded border border-white/10 bg-black px-3 py-1.5 text-white/70 transition-colors hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:border-white/5 disabled:text-white/20"
          >
            {MIRROR_INPUT_COPY.previousPresetButton}
          </button>
          <span className="text-white/45" style={{ fontFamily: "var(--font-mono)" }}>
            {presetRecords.length === 0 ? "0 / 0" : `${selectedPresetIndex + 1} / ${presetRecords.length}`}
          </span>
          <button
            type="button"
            onClick={() => onStepPreset(1)}
            disabled={selectedPresetIndex === -1 || selectedPresetIndex >= presetRecords.length - 1}
            className="rounded border border-white/10 bg-black px-3 py-1.5 text-white/70 transition-colors hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:border-white/5 disabled:text-white/20"
          >
            {MIRROR_INPUT_COPY.nextPresetButton}
          </button>
        </div>

        {presetRecords.length > 0 ? (
          <div className="mt-3 space-y-2">
            {presetRecords.map((record) => {
              const selected = record.id === selectedPresetId;
              const sourceLabel =
                record.roleLabel ??
                (record.sourceType === "questionnaire-result" ? "单次结果" : "数据集");

              return (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => onApplyPreset(record.id)}
                  className={`w-full rounded border px-3 py-2 text-left transition-colors ${
                    selected
                      ? "border-white bg-white text-black"
                      : "border-white/10 bg-black text-white/70 hover:border-white/30 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span>{record.label}</span>
                    <span className={selected ? "text-black/70" : "text-white/35"}>{sourceLabel}</span>
                  </div>
                  <div className={`mt-1 ${selected ? "text-black/70" : "text-white/45"}`}>
                    {record.status}
                    {record.nearCenterBand ? " / 接近中间带" : ""}
                  </div>
                  <div className={`mt-1 ${selected ? "text-black/70" : "text-white/35"}`}>
                    CE {record.ceMean.toFixed(1)} / RE {record.reMean.toFixed(1)} / {record.Y1}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 rounded border border-dashed border-white/10 px-3 py-4 text-center text-white/35">
            还没有问卷预设
          </div>
        )}
      </section>

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
              <span className="text-white/75">左侧轨道</span>
              <span className="text-white" style={{ fontFamily: "var(--font-mono)" }}>
                {config.leftTrackIndices.length} / {maxAvailableTracks}
              </span>
            </div>
            <div className="mb-2 flex items-center justify-between text-white/40">
              <span>指定绘制哪些轨</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setAllTracks("left", "all")}
                  className="cursor-pointer transition-colors hover:text-white"
                  type="button"
                >
                  全选
                </button>
                <button
                  onClick={() => setAllTracks("left", "clear")}
                  className="cursor-pointer transition-colors hover:text-white"
                  type="button"
                >
                  清空
                </button>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-1.5" id="track-picker-left">
              {Array.from({ length: maxAvailableTracks }, (_, index) => {
                const selected = config.leftTrackIndices.includes(index);
                return (
                  <button
                    key={`left-track-${index}`}
                    type="button"
                    onClick={() => toggleTrack("left", index)}
                    className={`rounded border px-0 py-1 text-center transition-colors ${
                      selected
                        ? "border-white bg-white text-black"
                        : "border-white/10 bg-black text-white/55 hover:border-white/30 hover:text-white"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <span className="mt-1.5 block text-white/35">支持明确选择左侧要显示的轨道编号</span>
          </div>

          <div>
            <div className="mb-1 flex justify-between">
              <span className="text-white/75">右侧轨道</span>
              <span className="text-white" style={{ fontFamily: "var(--font-mono)" }}>
                {config.rightTrackIndices.length} / {maxAvailableTracks}
              </span>
            </div>
            <div className="mb-2 flex items-center justify-between text-white/40">
              <span>指定绘制哪些轨</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setAllTracks("right", "all")}
                  className="cursor-pointer transition-colors hover:text-white"
                  type="button"
                >
                  全选
                </button>
                <button
                  onClick={() => setAllTracks("right", "clear")}
                  className="cursor-pointer transition-colors hover:text-white"
                  type="button"
                >
                  清空
                </button>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-1.5" id="track-picker-right">
              {Array.from({ length: maxAvailableTracks }, (_, index) => {
                const selected = config.rightTrackIndices.includes(index);
                return (
                  <button
                    key={`right-track-${index}`}
                    type="button"
                    onClick={() => toggleTrack("right", index)}
                    className={`rounded border px-0 py-1 text-center transition-colors ${
                      selected
                        ? "border-white bg-white text-black"
                        : "border-white/10 bg-black text-white/55 hover:border-white/30 hover:text-white"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <span className="mt-1.5 block text-white/35">支持明确选择右侧要显示的轨道编号</span>
          </div>
        </div>

        <div className="mb-5 rounded border border-white/10 bg-black/30 p-3" id="sec-rumination-distortion">
          <div className="mb-3 text-white/70" style={{ fontWeight: 400 }}>
            形变
          </div>

          {RUMINATION_CONTROL_SPECS.map((control, index) => (
            <div
              key={control.key}
              className={index === RUMINATION_CONTROL_SPECS.length - 1 ? undefined : "mb-3.5"}
            >
              <div className="mb-1 flex justify-between">
                <span className="text-stone-300">{control.label}</span>
                <span className="text-white" style={{ fontFamily: "var(--font-mono)" }}>
                  {control.formatValue(deformParams[control.key])}
                </span>
              </div>
              <input
                type="range"
                min={control.min}
                max={control.max}
                step={control.step}
                value={deformParams[control.key]}
                onChange={(event) =>
                  onChangeDeformParams({
                    ...deformParams,
                    [control.key]: parseFloat(event.target.value),
                  })
                }
                className="h-1 w-full cursor-pointer rounded bg-stone-800 accent-white"
                id={control.inputId}
              />
              <span className="mt-0.5 block text-stone-500">{control.description}</span>
            </div>
          ))}
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

          <div className="mb-2 text-stone-400">绝对频率</div>

          <div className="mb-3.5 grid grid-cols-2 gap-3">
            <div>
              <span className="mb-1 block text-stone-400">频率下限</span>
              <input
                type="number"
                value={frequencyMinInput}
                onChange={(event) => setFrequencyMinInput(event.target.value)}
                onBlur={() => commitFrequencyInputs()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commitFrequencyInputs();
                  }
                }}
                className="w-full rounded border border-stone-800 bg-stone-950 px-2 py-1 text-white outline-none focus:border-stone-600"
                style={{ fontFamily: "var(--font-mono)" }}
              />
            </div>
            <div>
              <span className="mb-1 block text-stone-400">频率上限</span>
              <input
                type="number"
                value={frequencyMaxInput}
                onChange={(event) => setFrequencyMaxInput(event.target.value)}
                onBlur={() => commitFrequencyInputs()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commitFrequencyInputs();
                  }
                }}
                className="w-full rounded border border-stone-800 bg-stone-950 px-2 py-1 text-white outline-none focus:border-stone-600"
                style={{ fontFamily: "var(--font-mono)" }}
              />
            </div>
          </div>

          <div className="mb-3.5">
            <div className="mb-1 flex justify-between">
              <span className="text-stone-300">振幅关系半径映射</span>
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
            <span className="mt-0.5 block text-stone-500">0% 完全按频率，100% 完全按平均振幅映射</span>
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
                value={radiusMinInput}
                onChange={(event) => setRadiusMinInput(event.target.value)}
                onBlur={() => commitRadiusInputs()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commitRadiusInputs();
                  }
                }}
                className="w-full rounded border border-stone-800 bg-stone-950 px-2 py-1 text-white outline-none focus:border-stone-600"
                style={{ fontFamily: "var(--font-mono)" }}
                id="input-rmin"
              />
            </div>
            <div>
              <span className="mb-1 block text-stone-400">半径上限</span>
              <input
                type="number"
                value={radiusMaxInput}
                onChange={(event) => setRadiusMaxInput(event.target.value)}
                onBlur={() => commitRadiusInputs()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commitRadiusInputs();
                  }
                }}
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

          <div className="mb-3.5">
            <div className="mb-1.5 flex items-center justify-between text-stone-300">
              <span>左侧绘制方式</span>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded border border-stone-800 bg-stone-950 p-1">
              <button
                onClick={() => onChangeConfig({ ...config, leftRenderMode: SideRenderMode.SEPARATE })}
                className={`cursor-pointer rounded py-1.5 transition-colors ${
                  config.leftRenderMode === SideRenderMode.SEPARATE
                    ? "bg-white text-black"
                    : "text-stone-400 hover:text-stone-200"
                }`}
                type="button"
              >
                分轨
              </button>
              <button
                onClick={() => onChangeConfig({ ...config, leftRenderMode: SideRenderMode.MERGED })}
                className={`cursor-pointer rounded py-1.5 transition-colors ${
                  config.leftRenderMode === SideRenderMode.MERGED
                    ? "bg-white text-black"
                    : "text-stone-400 hover:text-stone-200"
                }`}
                type="button"
              >
                加合
              </button>
            </div>
          </div>

          <div className="mb-3.5">
            <div className="mb-1.5 flex items-center justify-between text-stone-300">
              <span>右侧绘制方式</span>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded border border-stone-800 bg-stone-950 p-1">
              <button
                onClick={() => onChangeConfig({ ...config, rightRenderMode: SideRenderMode.SEPARATE })}
                className={`cursor-pointer rounded py-1.5 transition-colors ${
                  config.rightRenderMode === SideRenderMode.SEPARATE
                    ? "bg-white text-black"
                    : "text-stone-400 hover:text-stone-200"
                }`}
                type="button"
              >
                分轨
              </button>
              <button
                onClick={() => onChangeConfig({ ...config, rightRenderMode: SideRenderMode.MERGED })}
                className={`cursor-pointer rounded py-1.5 transition-colors ${
                  config.rightRenderMode === SideRenderMode.MERGED
                    ? "bg-white text-black"
                    : "text-stone-400 hover:text-stone-200"
                }`}
                type="button"
              >
                加合
              </button>
            </div>
          </div>

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
