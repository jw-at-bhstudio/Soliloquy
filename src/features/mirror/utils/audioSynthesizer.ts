/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VoiceprintData, VoiceprintTrack } from "../types";

export class StereoVoiceprintSynth {
  private audioCtx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentGainNode: GainNode | null = null;
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private startOffset: number = 0;
  private duration: number = 0;
  private animationId: number | null = null;
  
  // Callbacks
  public onTimeUpdate: (currentTime: number) => void = () => {};
  public onPlaybackEnded: () => void = () => {};

  constructor() {}

  /**
   * Initializes the audio context lazily
   */
  private initAudioContext() {
    if (!this.audioCtx) {
      // @ts-ignore
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  /**
   * Generates a stereo AudioBuffer from left and right tracks
   */
  private renderAudioBuffer(
    data: VoiceprintData,
    deformedTracks: VoiceprintTrack[],
    nLeft: number,
    nRight: number
  ): AudioBuffer {
    this.initAudioContext();
    const ctx = this.audioCtx!;
    const sampleRate = ctx.sampleRate || 44100;
    const duration = data.duration;
    const numSamples = Math.floor(duration * sampleRate);
    const buffer = ctx.createBuffer(2, numSamples, sampleRate);
    
    const leftChannelData = buffer.getChannelData(0);
    const rightChannelData = buffer.getChannelData(1);

    const frameCount = data.sampleCount;
    const f0 = data.f0;

    // Fast-access amplitude tables
    // Left side original tracks
    const leftAmpsTable: Float32Array[] = [];
    for (let k = 0; k < Math.min(nLeft, data.tracks.length); k++) {
      leftAmpsTable.push(new Float32Array(data.tracks[k].amplitudes));
    }

    // Right side deformed tracks
    const rightAmpsTable: Float32Array[] = [];
    for (let k = 0; k < Math.min(nRight, deformedTracks.length); k++) {
       rightAmpsTable.push(new Float32Array(deformedTracks[k].amplitudes));
    }

    // Precalculate phase accumulator arrays
    const phasesL = new Float32Array(leftAmpsTable.length);
    const phasesR = new Float32Array(rightAmpsTable.length);
    const dt = 1.0 / sampleRate;

    // Synthesis loop
    for (let n = 0; n < numSamples; n++) {
      const t = n * dt;
      // Interpolation index in data frames
      const pos = (t / duration) * (frameCount - 1);
      const idxA = Math.floor(pos);
      const idxB = Math.min(frameCount - 1, idxA + 1);
      const w = pos - idxA;

      const currentF0 = f0[idxA] * (1 - w) + f0[idxB] * w;

      // 1. Synthesize Left Channel (Original clean signals)
      let sumL = 0;
      let activeLCount = leftAmpsTable.length;
      
      for (let k = 0; k < activeLCount; k++) {
        const order = k + 1;
        const ampA = leftAmpsTable[k][idxA];
        const ampB = leftAmpsTable[k][idxB];
        const amp = ampA * (1 - w) + ampB * w;
        
        // Accumulate phase based on continuous frequency step
        phasesL[k] += 2 * Math.PI * (order * currentF0) * dt;
        
        // Wrap phase to keep precision high
        if (phasesL[k] > 2 * Math.PI) {
          phasesL[k] -= 2 * Math.PI;
        }

        sumL += amp * Math.sin(phasesL[k]);
      }

      // 2. Synthesize Right Channel (Deformed metallic signals)
      let sumR = 0;
      let activeRCount = rightAmpsTable.length;
      
      for (let k = 0; k < activeRCount; k++) {
        const order = k + 1;
        const ampA = rightAmpsTable[k][idxA];
        const ampB = rightAmpsTable[k][idxB];
        const amp = ampA * (1 - w) + ampB * w;

        // Cumulative phase
        phasesR[k] += 2 * Math.PI * (order * currentF0) * dt;
        if (phasesR[k] > 2 * Math.PI) {
          phasesR[k] -= 2 * Math.PI;
        }

        // Incorporate a slightly altered metallic ring modulation
        // by mapping wavefolded carrier harmonics
        const carrier = Math.sin(phasesR[k]);
        
        sumR += amp * carrier;
      }

      // Normalization factor & soft protection limiting to avoid standard digital clipping
      // Scaled by 0.35/sqrt(harmonicCount) to guarantee standard comfortable volume range.
      const factorL = activeLCount > 0 ? 0.38 / Math.sqrt(activeLCount) : 0;
      const factorR = activeRCount > 0 ? 0.38 / Math.sqrt(activeRCount) : 0;

      // Write samples
      leftChannelData[n] = Math.max(-1.0, Math.min(1.0, sumL * factorL));
      rightChannelData[n] = Math.max(-1.0, Math.min(1.0, sumR * factorR));
    }

    return buffer;
  }

  /**
   * Initiates double track stereo ensemble play
   */
  public playEnsemble(
    data: VoiceprintData,
    deformedTracks: VoiceprintTrack[],
    nLeft: number,
    nRight: number
  ) {
    this.stop();
    this.initAudioContext();
    
    this.duration = data.duration;
    const buffer = this.renderAudioBuffer(data, deformedTracks, nLeft, nRight);

    const source = this.audioCtx!.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.audioCtx!.createGain();
    // Soft volume fade-in at boot time (10ms)
    gainNode.gain.setValueAtTime(0.001, this.audioCtx!.currentTime);
    gainNode.gain.linearRampToValueAtTime(1.0, this.audioCtx!.currentTime + 0.012);

    source.connect(gainNode);
    gainNode.connect(this.audioCtx!.destination);

    this.currentSource = source;
    this.currentGainNode = gainNode;
    this.isPlaying = true;
    this.startTime = this.audioCtx!.currentTime;
    this.startOffset = 0;

    source.start(0);
    
    // Playback state callbacks
    source.onended = () => {
      // Confirm that this was not due to an explicit manual stop trigger
      if (this.currentSource === source) {
        this.isPlaying = false;
        this.currentSource = null;
        this.currentGainNode = null;
        if (this.animationId) {
          cancelAnimationFrame(this.animationId);
          this.animationId = null;
        }
        this.onPlaybackEnded();
      }
    };

    this.tickProgress();
  }

  /**
   * Monitors and ticks the playback progress
   */
  private tickProgress = () => {
    if (!this.isPlaying || !this.audioCtx) return;

    const elapsed = this.audioCtx.currentTime - this.startTime + this.startOffset;
    if (elapsed >= this.duration) {
      this.onTimeUpdate(this.duration);
    } else {
      this.onTimeUpdate(elapsed);
      this.animationId = requestAnimationFrame(this.tickProgress);
    }
  };

  /**
   * Mutes or stops the synthesizer playback
   */
  public stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.currentSource) {
      try {
        if (this.audioCtx) {
          // Soft fade-out over 8ms to prevent audio pops
          const stopTime = this.audioCtx.currentTime;
          this.currentGainNode?.gain.setValueAtTime(this.currentGainNode.gain.value, stopTime);
          this.currentGainNode?.gain.exponentialRampToValueAtTime(0.001, stopTime + 0.008);
          this.currentSource.stop(stopTime + 0.01);
        } else {
          this.currentSource.stop();
        }
      } catch (err) {
        // Source might have finished already
      }
      this.currentSource = null;
      this.currentGainNode = null;
    }
    
    this.isPlaying = false;
    this.onTimeUpdate(0);
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getDuration(): number {
    return this.duration;
  }
}
export const globalSynth = new StereoVoiceprintSynth();
