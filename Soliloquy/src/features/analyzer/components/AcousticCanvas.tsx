/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useEffect, useState } from 'react';
import { AnalyzedAudio } from '../types';

interface AcousticCanvasProps {
  analysis: AnalyzedAudio | null;
  selectedTracks: boolean[]; // Checklist of enabled tracks (same length as analysis.harmonics)
  displayMode: 'components' | 'additive' | 'both';
  currentTime: number; // For playhead indicator
}

export default function AcousticCanvas({
  analysis,
  selectedTracks,
  displayMode,
  currentTime,
}: AcousticCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  // Dynamically watch container boundaries to implement pixel-perfect responsive canvas resizing
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 400),
          height: Math.max(height, 350),
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Grid and waves rendering pass
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;

    // Use standard devicePixelRatio backing store scaling to resolve fuzzy pixel canvas bugs on Retina/High-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Setup pristine 1px line drawing anti-aliasing offsets
    ctx.translate(0.5, 0.5);

    // Grid margins
    const marginL = 60;
    const marginR = 30;
    const marginT = 40;
    const marginB = 40;

    const drawW = width - marginL - marginR;
    const drawH = height - marginT - marginB;
    const centerY = marginT + drawH / 2;

    // 1. Fill Absolute Black canvas background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // 2. Render oscilloscope grids (using thin white dashed/solid 1px lines)
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#222222'; // Fine-grid tone (dark white)
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px "JetBrains Mono", monospace';

    // Vertical columns grid (Time columns offset across draw region)
    const gridCols = 10;
    for (let i = 0; i <= gridCols; i++) {
      const x = marginL + (i / gridCols) * drawW;
      
      // Draw Grid Line
      ctx.beginPath();
      ctx.strokeStyle = i === 0 ? '#ffffff' : '#222222';
      ctx.setLineDash(i === 0 ? [] : [2, 4]);
      ctx.moveTo(x, marginT);
      ctx.lineTo(x, marginT + drawH);
      ctx.stroke();

      // Render X ticks labels (Duration representation)
      if (analysis) {
        const tVal = (i / gridCols) * analysis.duration;
        ctx.textAlign = 'center';
        ctx.fillText(`${tVal.toFixed(2)}s`, x, marginT + drawH + 18);
      } else {
        ctx.textAlign = 'center';
        ctx.fillText(`${(i / gridCols * 10).toFixed(1)}s`, x, marginT + drawH + 18);
      }
    }

    // Horizontal rows grid (Amplitude offset across center line)
    const gridRows = 8;
    for (let j = 0; j <= gridRows; j++) {
      const y = marginT + (j / gridRows) * drawH;
      const ampVal = 1.0 - (j / (gridRows / 2));

      ctx.beginPath();
      // Center axis is highlighted solid
      ctx.strokeStyle = Math.abs(ampVal) < 1e-4 ? '#ffffff' : '#222222';
      ctx.setLineDash(Math.abs(ampVal) < 1e-4 ? [] : [2, 4]);
      ctx.moveTo(marginL, y);
      ctx.lineTo(marginL + drawW, y);
      ctx.stroke();

      // Render Y ticks labels (Amplitude scale)
      ctx.textAlign = 'right';
      ctx.fillText(ampVal.toFixed(1), marginL - 10, y + 4);
    }
    
    // Reset Line Dash for general waveform lines
    ctx.setLineDash([]);

    // Check if we have active processed data to draw
    if (!analysis || analysis.frameCount <= 0) {
      // Paint elegant empty lab screen watermark instruction helper
      ctx.textAlign = 'center';
      ctx.font = '13px "Inter", sans-serif';
      ctx.fillStyle = '#666666';
      ctx.fillText('等待音频采集与特征提取...', marginL + drawW / 2, centerY);
      return;
    }

    // Solve sample interpolation helper
    const interpolateData = (data: number[], leftFrame: number, rightFrame: number, weight: number): number => {
      const vLeft = data[leftFrame];
      const vRight = data[rightFrame];
      return vLeft + weight * (vRight - vLeft);
    };

    // Calculate time phase integration parameters
    const dt = analysis.duration / drawW;
    const numTracks = analysis.harmonics.length;
    const phases = new Float64Array(numTracks).fill(0);

    // We store pre-calculated coordinates to render lines beautifully
    const points: { x: number; ys: number[]; yTotal: number }[] = [];
    const frameTimes = analysis.times;
    const frameCount = analysis.frameCount;

    // Scan step-by-step through drawing horizontal width
    for (let xOffset = 0; xOffset <= drawW; xOffset++) {
      const t = xOffset * dt;

      // Locate framing indices
      let leftFrame = 0;
      let rightFrame = 0;
      let weight = 0;

      if (t <= frameTimes[0]) {
        leftFrame = 0;
        rightFrame = 0;
        weight = 0;
      } else if (t >= frameTimes[frameCount - 1]) {
        leftFrame = frameCount - 1;
        rightFrame = frameCount - 1;
        weight = 0;
      } else {
        let found = 0;
        for (let k = 0; k < frameCount - 1; k++) {
          if (t >= frameTimes[k] && t <= frameTimes[k + 1]) {
            found = k;
            break;
          }
        }
        leftFrame = found;
        rightFrame = found + 1;
        const t1 = frameTimes[leftFrame];
        const t2 = frameTimes[rightFrame];
        weight = (t - t1) / (t2 - t1);
      }

      const ys: number[] = [];
      let yAccum = 0;

      for (let trackIdx = 0; trackIdx < numTracks; trackIdx++) {
        const track = analysis.harmonics[trackIdx];
        const amp = interpolateData(track.amplitudes, leftFrame, rightFrame, weight);
        const freq = interpolateData(track.frequencies, leftFrame, rightFrame, weight);

        if (freq > 0) {
          // VISUAL NOISE CANCELLING FREQUENCY SCALING: Compress pitch frequency by 100x
          const visualFreq = freq / 100.0;
          const dPhase = 2 * Math.PI * visualFreq * dt;
          phases[trackIdx] += dPhase;
        }

        // Compute sine value for this track
        const waveVal = amp * Math.sin(phases[trackIdx]);
        ys.push(waveVal);

        // Sum up if the track is currently checked/selected
        if (selectedTracks[trackIdx] !== false) {
          yAccum += waveVal;
        }
      }

      points.push({
        x: marginL + xOffset,
        ys,
        yTotal: yAccum,
      });
    }

    // 3. Render curves: 1px pure white solid lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ffffff';

    const drawWavePath = (getValY: (p: typeof points[0]) => number, opacity: number = 1.0) => {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
      
      let started = false;
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const valY = getValY(pt);
        // Vertical projection center lines
        const plotY = centerY - valY * (drawH / 2.2); // Multiply 85% headroom
        
        if (!started) {
          ctx.moveTo(pt.x, plotY);
          started = true;
        } else {
          ctx.lineTo(pt.x, plotY);
        }
      }
      ctx.stroke();
    };

    // Draw lines according to selected display modes
    if (displayMode === 'components' || displayMode === 'both') {
      // Draw individual selected harmonic wave lines
      for (let hIndex = 0; hIndex < numTracks; hIndex++) {
        if (selectedTracks[hIndex] === false) continue;
        
        // Multi-line component drawing with absolute monochrome compliance. 
        // We can draw components with subtle style or transparency variation so they can be separated.
        // E.g., multiplier label starts drawing or we use varying alpha of white (from 0.35 to 0.75) so lines are differentiable, 
        // while maintaining the strict pure white constraint!
        const alpha = 0.4 + (hIndex / numTracks) * 0.45; // Varying whites
        drawWavePath((pt) => pt.ys[hIndex], alpha);
      }
    }

    if (displayMode === 'additive' || displayMode === 'both') {
      // Draw standard double-bold white additive waveforms sum line (100% full solid white opacity!)
      ctx.shadowColor = 'rgba(255,255,255,0.4)';
      ctx.shadowBlur = displayMode === 'both' ? 2 : 0; // Soft bloom indicator highlights additive curve
      drawWavePath((pt) => pt.yTotal, 1.0);
      ctx.shadowBlur = 0; // reset
    }

    // 4. Draw labels for tracks visible in plot corners
    ctx.fillStyle = '#666666';
    ctx.textAlign = 'left';
    ctx.font = '11px "JetBrains Mono", monospace';
    // Top Right watermarking settings info
    const modeChinese = displayMode === 'components' 
      ? '分量音轨波形分布图' 
      : displayMode === 'additive' 
        ? '加性合成重构总叠波图' 
        : '混合显示（分量 + 叠加重构）';
    ctx.fillText(`展示状态: ${modeChinese} | 采样率: ${analysis.sampleRate}Hz | 时长: ${analysis.duration.toFixed(2)}s`, marginL, marginT - 15);

    // 5. Render moving Playback cursor timeline tracker
    if (currentTime > 0 && currentTime <= analysis.duration) {
      const cursorX = marginL + (currentTime / analysis.duration) * drawW;
      
      // Vertical cursor line marker
      ctx.beginPath();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 2]); // Dotted white
      ctx.moveTo(cursorX, marginT - 10);
      ctx.lineTo(cursorX, marginT + drawH + 10);
      ctx.stroke();
      ctx.setLineDash([]); // clear

      // Floating cursor time label
      ctx.fillStyle = '#ffffff';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      
      // Floating box banner representing head indices
      ctx.fillRect(cursorX - 25, marginT - 25, 50, 15);
      ctx.fillStyle = '#000000';
      ctx.fillText(`${currentTime.toFixed(2)}s`, cursorX, marginT - 14);
    }

  }, [dimensions, analysis, selectedTracks, displayMode, currentTime]);

  /**
   * Generates a high-fidelity monochrome SVG string for visual clipboard replication
   */
  const handleCopySVG = () => {
    if (!analysis || analysis.frameCount <= 0) {
      alert('无可用数据，请先载入并分析音频! ');
      return;
    }

    const marginL = 60;
    const marginR = 30;
    const marginT = 40;
    const marginB = 40;

    const { width, height } = dimensions;
    const drawW = width - marginL - marginR;
    const drawH = height - marginT - marginB;
    const centerY = marginT + drawH / 2;

    const dt = analysis.duration / drawW;
    const numTracks = analysis.harmonics.length;
    const phases = new Float64Array(numTracks).fill(0);

    // Phase extraction
    const points: { x: number; ys: number[]; yTotal: number }[] = [];
    const frameTimes = analysis.times;
    const frameCount = analysis.frameCount;

    for (let xOffset = 0; xOffset <= drawW; xOffset++) {
      const t = xOffset * dt;
      let leftFrame = 0;
      let rightFrame = 0;
      let weight = 0;

      if (t <= frameTimes[0]) {
        leftFrame = 0;
        rightFrame = 0;
        weight = 0;
      } else if (t >= frameTimes[frameCount - 1]) {
        leftFrame = frameCount - 1;
        rightFrame = frameCount - 1;
        weight = 0;
      } else {
        let found = 0;
        for (let k = 0; k < frameCount - 1; k++) {
          if (t >= frameTimes[k] && t <= frameTimes[k + 1]) {
            found = k;
            break;
          }
        }
        leftFrame = found;
        rightFrame = found + 1;
        const t1 = frameTimes[leftFrame];
        const t2 = frameTimes[rightFrame];
        weight = (t - t1) / (t2 - t1);
      }

      const ys: number[] = [];
      let yAccum = 0;

      for (let trackIdx = 0; trackIdx < numTracks; trackIdx++) {
        const track = analysis.harmonics[trackIdx];
        const amp = track.amplitudes[leftFrame] + weight * (track.amplitudes[rightFrame] - track.amplitudes[leftFrame]);
        const freq = track.frequencies[leftFrame] + weight * (track.frequencies[rightFrame] - track.frequencies[leftFrame]);

        if (freq > 0) {
          const visualFreq = freq / 100.0;
          phases[trackIdx] += 2 * Math.PI * visualFreq * dt;
        }

        const waveVal = amp * Math.sin(phases[trackIdx]);
        ys.push(waveVal);

        if (selectedTracks[trackIdx] !== false) {
          yAccum += waveVal;
        }
      }

      points.push({
        x: marginL + xOffset,
        ys,
        yTotal: yAccum,
      });
    }

    // Build perfect SVG string with pure black lines (no background, no text layout overlaps)
    // Stroke = #000000, 1px lines width, fill = none
    let svgPathContent = '';

    if (displayMode === 'components' || displayMode === 'both') {
      for (let hIndex = 0; hIndex < numTracks; hIndex++) {
        if (selectedTracks[hIndex] === false) continue;
        
        let pathD = '';
        for (let i = 0; i < points.length; i++) {
          const pt = points[i];
          const valY = pt.ys[hIndex];
          const plotY = centerY - valY * (drawH / 2.2);
          
          if (i === 0) {
            pathD += `M ${pt.x.toFixed(1)} ${plotY.toFixed(1)}`;
          } else {
            pathD += ` L ${pt.x.toFixed(1)} ${plotY.toFixed(1)}`;
          }
        }
        svgPathContent += `  <!-- 谐波分量音轨 #${hIndex + 1} (Multiplier: ${hIndex + 1}) -->\n`;
        svgPathContent += `  <path d="${pathD}" stroke="#000000" stroke-width="1" fill="none" opacity="0.6" stroke-linecap="round" stroke-linejoin="round" />\n`;
      }
    }

    if (displayMode === 'additive' || displayMode === 'both') {
      let pathD = '';
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const valY = pt.yTotal;
        const plotY = centerY - valY * (drawH / 2.2);
        
        if (i === 0) {
          pathD += `M ${pt.x.toFixed(1)} ${plotY.toFixed(1)}`;
        } else {
          pathD += ` L ${pt.x.toFixed(1)} ${plotY.toFixed(1)}`;
        }
      }
      svgPathContent += '  <!-- 加性合成叠加总波形曲线 -->\n';
      svgPathContent += `  <path d="${pathD}" stroke="#000000" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />\n`;
    }

    // Assemble full XML string
    const svgHeader = `<?xml version="1.0" encoding="utf-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
    const svgGrid = `  <!-- 精密示波器 X-Y 坐标系与基础网格 (黑色，导入白底图纸时极度清晰) -->\n  <line x1="${marginL}" y1="${marginT}" x2="${marginL}" y2="${marginT + drawH}" stroke="#dddddd" stroke-width="1.5" />\n  <line x1="${marginL}" y1="${centerY}" x2="${marginL + drawW}" y2="${centerY}" stroke="#dddddd" stroke-width="1.5" />\n`;
    const svgFooter = `</svg>`;
    
    const fullSVGString = svgHeader + svgGrid + svgPathContent + svgFooter;

    navigator.clipboard.writeText(fullSVGString)
      .then(() => {
        alert('SVG 矢量路径已复制到剪贴板，可直接导入矢量设计软件。');
      })
      .catch((err) => {
        console.error('Copy fail: ', err);
        alert('复制失败，请重试。');
      });
  };

  return (
    <div className="flex flex-col h-full bg-black rounded border border-white/10" id="acoustic-analyser-canvas-group">
      {/* Visual Canvas container */}
      <div ref={containerRef} className="relative flex-1 min-h-[300px] w-full bg-black overflow-hidden p-1">
        <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair rounded" id="analyser-p5-canvas" />
      </div>
      
      {/* Simple Sub-bar controls for Instant Clip actions */}
      <div className="flex justify-between items-center px-4 py-2 border-t border-white/10 bg-[#070707]">
        <div className="text-white/40">
          <span>分辨率：</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            {dimensions.width}×{dimensions.height}
          </span>
          <span>｜坐标点：</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{dimensions.width - 90}</span>
          <span> 像素</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopySVG}
            disabled={!analysis}
            className={`px-3 py-1 border rounded transition duration-150 ${
              analysis 
                ? 'border-white/20 text-white hover:bg-white hover:text-black hover:border-white' 
                : 'border-white/5 text-white/20 cursor-not-allowed'
            }`}
          >
            复制 SVG
          </button>
        </div>
      </div>
    </div>
  );
}
