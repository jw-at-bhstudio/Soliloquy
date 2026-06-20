/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from "react";
import { VoiceprintData, VoiceprintTrack, RenderConfig } from "../types";
import { calculateTrackPoints, TrackLinePoints } from "../utils/coordinateCalculators";

interface VoiceprintCanvasProps {
  data: VoiceprintData;
  deformedTracks: VoiceprintTrack[];
  config: RenderConfig;
  cumulativePhase: Float32Array;
  playbackTime: number; // Current playback progress in seconds (0 to data.duration)
  onExportPoints: (points: TrackLinePoints[]) => void; // Syncs coordinate points for SVG copy
}

export function VoiceprintCanvas({
  data,
  deformedTracks,
  config,
  cumulativePhase,
  playbackTime,
  onExportPoints
}: VoiceprintCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Interaction States (Zoom and Pan)
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset interactive view coordinates
  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Canvas zoom via mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.08;
    const nextZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    setZoom(Math.max(0.4, Math.min(8.0, nextZoom)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fetch bounding size
    const width = canvas.clientWidth || 550;
    const height = canvas.clientHeight || 550;

    // Handle Retina scaling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Coordinate Center (cx, cy) before Pan
    const cx = width / 2;
    const cy = height / 2;

    // Compute coordinate points (centered at 0, 0 for easy zoom/pan computation)
    const rawTrackPoints = calculateTrackPoints(
      data,
      deformedTracks,
      config,
      cumulativePhase,
      0, // centered at 0
      0  // centered at 0
    );

    // Expose generated coordinates to parent component so copy-SVG works perfectly with current sliders
    onExportPoints(rawTrackPoints);

    // Apply viewport transformations
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    // 1. Move origin to center + pan offsets
    ctx.translate(cx + pan.x, cy + pan.y);
    // 2. Scale coordinate grids based on zoom state
    ctx.scale(zoom, zoom);

    // --- DRAW BACKGROUND REF GRID ---
    if (config.showGrid) {
      // Draw Concentric circular guides
      const gridCircleCount = 6;
      for (let i = 0; i <= gridCircleCount; i++) {
        const r = config.radiusMin + (i / gridCircleCount) * (config.radiusMax - config.radiusMin);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, 2 * Math.PI);
        // Extremely thin faint lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
        ctx.lineWidth = 0.6;
        ctx.stroke();

        // Label concentric circles with faint numbers
        if (i > 0 && i < gridCircleCount) {
          ctx.font = "8px monospace";
          ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
          ctx.textAlign = "center";
          ctx.fillText(`${r.toFixed(0)}px`, 0, -r - 2);
        }
      }

      // Draw polar radial axes (every 30 degrees)
      const axesCount = 12;
      ctx.setLineDash([2, 4]); // Dashed grid
      for (let i = 0; i < axesCount; i++) {
        const angle = (i / axesCount) * 2 * Math.PI;
        ctx.beginPath();
        const rStart = config.radiusMin - 10;
        const rEnd = config.radiusMax + 15;
        ctx.moveTo(rStart * Math.cos(angle), rStart * Math.sin(angle));
        ctx.lineTo(rEnd * Math.cos(angle), rEnd * Math.sin(angle));
        ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
      ctx.setLineDash([]); // Restore solid line

      // Label poles (Futuristic annotations)
      ctx.font = "9px monospace";
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("0.5π", 0, -(config.radiusMax + 30));
      ctx.fillText("1.5π", 0, (config.radiusMax + 30));
      ctx.textAlign = "left";
      ctx.fillText("0 / 2π", config.radiusMax + 24, 0);
      ctx.textAlign = "right";
      ctx.fillText("π", -(config.radiusMax + 24), 0);
    }

    // --- DRAW VECTOR VECTOR SOUND LINES (1px Pure White) ---
    rawTrackPoints.forEach((trackLine) => {
      // 1. Render Left Hemisphere (Original self-adaptive lines)
      if (trackLine.leftPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(trackLine.leftPoints[0].x, trackLine.leftPoints[0].y);
        for (let i = 1; i < trackLine.leftPoints.length; i++) {
          ctx.lineTo(trackLine.leftPoints[i].x, trackLine.leftPoints[i].y);
        }
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }

      // 2. Render Right Hemisphere (Deformed backwards lines)
      if (trackLine.rightPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(trackLine.rightPoints[0].x, trackLine.rightPoints[0].y);
        for (let i = 1; i < trackLine.rightPoints.length; i++) {
          ctx.lineTo(trackLine.rightPoints[i].x, trackLine.rightPoints[i].y);
        }
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }
    });

    ctx.restore();

    // Canvas Frame Borders and Corner Accents (Futuristic HUD feel)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // Tech corners markers
    const cs = 10; // corner size
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1;

    // Top-Left
    ctx.beginPath(); ctx.moveTo(0, cs); ctx.lineTo(0, 0); ctx.lineTo(cs, 0); ctx.stroke();
    // Top-Right
    ctx.beginPath(); ctx.moveTo(width - cs, 0); ctx.lineTo(width, 0); ctx.lineTo(width, cs); ctx.stroke();
    // Bottom-Left
    ctx.beginPath(); ctx.moveTo(0, height - cs); ctx.lineTo(0, height); ctx.lineTo(cs, height); ctx.stroke();
    // Bottom-Right
    ctx.beginPath(); ctx.moveTo(width - cs, height); ctx.lineTo(width, height); ctx.lineTo(width, height - cs); ctx.stroke();

  }, [data, deformedTracks, config, cumulativePhase, playbackTime, zoom, pan, isDragging, config.showGrid]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-[480px] lg:h-full min-h-[440px] bg-black select-none rounded bg-[#010101]"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
      id="viewport-parent"
    >
      <div
        className="absolute top-4 left-4 z-10 flex flex-col gap-1 text-white/50 pointer-events-none"
        style={{ fontSize: "var(--text-ui)", fontWeight: 400 }}
      >
        <span>绘制状态：正常</span>
        <span>
          缩放：<span style={{ fontFamily: "var(--font-mono)" }}>{zoom.toFixed(2)}×</span>
        </span>
        <span>
          偏移：X <span style={{ fontFamily: "var(--font-mono)" }}>{pan.x.toFixed(0)}px</span> / Y{" "}
          <span style={{ fontFamily: "var(--font-mono)" }}>{pan.y.toFixed(0)}px</span>
        </span>
      </div>

      <button
        onClick={handleResetView}
        className="absolute bottom-4 right-4 z-20 rounded border border-white/10 bg-black px-2 py-1 text-white/60 transition-colors hover:border-white/30 hover:text-white"
        style={{ fontSize: "var(--text-ui)", fontWeight: 400 }}
        id="btn-reset-view"
      >
        重置视图
      </button>

      {/* Interactive Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block" id="vector-voiceprint-canvas" />
    </div>
  );
}
