/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Mic, Square, ShieldAlert } from 'lucide-react';

interface RecorderProps {
  onAudioRecorded: (audioData: Float32Array, sampleRate: number, fileName: string) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
}

export default function Recorder({ onAudioRecorded, isLoading, setIsLoading }: RecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [durationLimit, setDurationLimit] = useState<number>(5); // 5 or 10 seconds default
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopTracks();
    };
  }, []);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    setMicError(null);
    chunksRef.current = [];
    setIsLoading(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('您的浏览器不支持或未开启麦克风权限');
      }

      // 1. Request microphone access stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      streamRef.current = stream;

      // 2. Instantiate standard browser MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsLoading(true);
        try {
          const rawBlob = new Blob(chunksRef.current, { type: 'audio/webm; codecs=opus' });
          const arrayBuffer = await rawBlob.arrayBuffer();

          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();

          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer).catch((err) => {
            console.error('Mic data decode error: ', err);
            throw new Error('录音解码分析失败。请尝试缩短录音或更换浏览器。');
          });

          // Extract single channel (downmix)
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

          const nowStr = new Date().toLocaleTimeString('zh-CN', { hour12: false });
          onAudioRecorded(audioData, sampleRate, `录音采集_${nowStr}.wav`);
          audioCtx.close();
        } catch (err: any) {
          console.error(err);
          setMicError(err.message || '录音解码出错');
        } finally {
          setIsLoading(false);
          setIsRecording(false);
          stopTracks();
        }
      };

      // 3. Start recording chunks
      mediaRecorder.start(100); // chunk every 100ms
      setIsRecording(true);
      setTimeLeft(durationLimit);

      // 4. Record countdown ticker
      let count = durationLimit;
      timerRef.current = setInterval(() => {
        count--;
        setTimeLeft(count);
        if (count <= 0) {
          stopRecording();
        }
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setMicError(err.name === 'NotAllowedError' ? '无法访问麦克风。请在浏览器中允许本网页使用麦克风端口权限。' : (err.message || '麦克风开启失败'));
      setIsRecording(false);
      setIsLoading(false);
      stopTracks();
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div id="mic-recorder-root" className="flex flex-col gap-4" style={{ fontSize: 'var(--text-ui)' }}>
      <div className="flex items-center justify-between">
        <span className="text-white/40">录音时长</span>

        <div className="flex gap-2" id="duration-selector-group">
          {!isRecording && (
            <>
              <button
                disabled={isLoading}
                onClick={() => setDurationLimit(5)}
                className={`px-2.5 py-1 border rounded transition-all duration-150 ${
                  durationLimit === 5
                    ? 'border-white text-white'
                    : 'border-white/10 text-white/50 hover:text-white hover:border-white/30'
                }`}
              >
                5秒
              </button>
              <button
                disabled={isLoading}
                onClick={() => setDurationLimit(10)}
                className={`px-2.5 py-1 border rounded transition-all duration-150 ${
                  durationLimit === 10
                    ? 'border-white text-white'
                    : 'border-white/10 text-white/50 hover:text-white hover:border-white/30'
                }`}
              >
                10秒
              </button>
            </>
          )}
        </div>
      </div>

      <div
        className="flex items-center justify-center rounded border border-white/5 bg-black p-3"
        id="mic-main-button-container"
      >
        {isRecording ? (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse border border-red-500" />
              <span className="text-red-500">录音中</span>
            </div>

            <div className="rounded border border-white/10 bg-white/5 px-3 py-1 text-white">
              剩余时间:{' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>{timeLeft}s</span> /{' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>{durationLimit}s</span>
            </div>

            <button
              onClick={stopRecording}
              className="flex items-center gap-1.5 rounded border border-red-500 bg-red-600 px-4 py-1.5 text-white transition duration-150 hover:bg-red-700 active:scale-95"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>停止并分析</span>
            </button>
          </div>
        ) : (
          <button
            onClick={startRecording}
            disabled={isLoading}
            className={`flex items-center gap-2.5 rounded border px-6 py-3 transition-all duration-150 active:scale-95 ${
              isLoading
                ? 'border-white/5 text-white/20 cursor-not-allowed bg-[#080808]'
                : 'border-white/20 hover:border-white hover:bg-white hover:text-black hover:shadow-lg text-white'
            }`}
          >
            <Mic className="w-4 h-4" strokeWidth={1.5} />
            <span>
              开始录音（<span style={{ fontFamily: 'var(--font-mono)' }}>{durationLimit}</span> 秒）
            </span>
          </button>
        )}
      </div>

      {micError && (
        <div className="flex items-start gap-2 rounded border border-red-500/20 bg-red-500/5 p-3 text-red-400">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span>提示:</span>
            <span>{micError}</span>
          </div>
        </div>
      )}
    </div>
  );
}
