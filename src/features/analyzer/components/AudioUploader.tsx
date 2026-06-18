/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, FileAudio, Check, AlertCircle } from 'lucide-react';

interface AudioUploaderProps {
  onAudioLoaded: (audioData: Float32Array, sampleRate: number, fileName: string) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
}

export default function AudioUploader({ onAudioLoaded, isLoading, setIsLoading }: AudioUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setIsLoading(true);

    try {
      // 1. Create offline audio context
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) {
        throw new Error('您的浏览器不支持 Web Audio API');
      }
      
      const audioCtx = new AudioCtxClass();
      
      // 2. Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // 3. Decode into AudioBuffer
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer).catch((err) => {
        console.error('Decode data error: ', err);
        throw new Error('音频解码失败，请确保上传符合标准的音频文件（如 wav, mp3, ogg 等）');
      });

      // 4. Extract single-channel raw floats (downmix stereo to mono to guarantee DSP precision)
      const numSamples = audioBuffer.length;
      const sampleRate = audioBuffer.sampleRate;
      const audioData = new Float32Array(numSamples);

      if (audioBuffer.numberOfChannels >= 2) {
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);
        for (let i = 0; i < numSamples; i++) {
          audioData[i] = (left[i] + right[i]) / 2;
        }
      } else {
        audioData.set(audioBuffer.getChannelData(0));
      }

      setLoadedFileName(file.name);
      onAudioLoaded(audioData, sampleRate, file.name);
      audioCtx.close();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || '加载音频文件发生错误');
    } finally {
      setIsLoading(false);
    }
  };

  const processFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) {
      return;
    }

    setLoadedFileName(list.length === 1 ? list[0].name : `${list.length} 个批量文件`);

    for (const file of list) {
      // Queue files sequentially so the parent can safely build a batch list.
      // Each file still enters the same decoder pipeline.
      await processFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void processFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      void processFiles(e.target.files);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div id="audio-uploader-root" className="w-full" style={{ fontSize: 'var(--text-ui)' }}>
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded text-center cursor-pointer transition-all duration-200 ${
          dragActive 
            ? 'border-white bg-[#111111]' 
            : 'border-white/20 hover:border-white/50 bg-[#050505]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={handleChange}
          disabled={isLoading}
        />

        <div className="p-3 mb-2 rounded-full border border-white/10 bg-black">
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : loadedFileName ? (
            <Check className="w-6 h-6 text-white" />
          ) : (
            <Upload className="w-6 h-6 text-white" strokeWidth={1} />
          )}
        </div>

        {loadedFileName ? (
          <div>
            <p className="line-clamp-1 text-white">{loadedFileName}</p>
            <p className="mt-1 text-white/40">继续点击或拖拽，可追加更多音频进入任务列表。</p>
          </div>
        ) : (
          <div>
            <p className="text-white">点击上传或拖拽多个音频到此处</p>
            <p className="mt-1 text-white/40">支持 WAV、MP3、OGG、M4A 等格式。</p>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="mt-3 flex items-center gap-2 rounded border border-red-500/20 bg-red-500/5 p-3 text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
