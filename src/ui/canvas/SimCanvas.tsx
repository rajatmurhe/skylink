import React, { useRef, useEffect, useState } from 'react';
import { useSimStore } from '../../store/simStore';
import { generateCoverageGrid } from '../../sim/monitor';
import {
  drawTerrainGrid,
  drawHeatmapGrid,
  drawObstaclesAndJammers,
  drawTowers,
  drawWaypoints,
  drawFlightTrail,
  drawUAV,
} from './renderers';
import { computeCommState } from '../../sim/comm_model';

export const SimCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { engine, currentRecord, historyRecords, isHeatmapVisible, isGhostVisible } =
    useSimStore();

  const world = currentRecord?.world ?? engine.world;
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; q: number } | null>(null);
  const [coverageGrid, setCoverageGrid] = useState<number[][]>([]);

  // Generate coverage grid when world changes
  useEffect(() => {
    const grid = generateCoverageGrid(world, 40, 40, engine.shadowNoiseMap);
    setCoverageGrid(grid);
  }, [world, engine.shadowNoiseMap]);

  // Main 60 fps requestAnimationFrame render loop
  useEffect(() => {
    let animFrameId: number;

    const render = (timeMs: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // 1. Draw base terrain grid & home base
      drawTerrainGrid(ctx, width, height, world);

      // 2. Draw Heatmap overlay if toggled
      if (isHeatmapVisible && coverageGrid.length > 0) {
        drawHeatmapGrid(ctx, width, height, coverageGrid);
      }

      // 3. Draw obstacles & jammers
      drawObstaclesAndJammers(ctx, width, height, world);

      // 4. Draw towers
      drawTowers(ctx, width, height, world, timeMs);

      // 5. Draw waypoints
      drawWaypoints(ctx, width, height, world, currentRecord?.waypoints ?? engine.waypoints);

      // 6. Draw flight trail
      drawFlightTrail(ctx, width, height, world, historyRecords.filter(r => r.tick <= (currentRecord?.tick ?? Infinity)));

      // Planned route belongs to live state; historical views show the recorded trail only.
      if (currentRecord?.tick === engine.tick && engine.plannedPath.length > 0 && engine.strategy !== 'baseline') {
        ctx.save(); ctx.strokeStyle = '#a5edba88'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]); ctx.beginPath();
        ctx.moveTo(engine.uav.position.x / world.mapSize.width * width, engine.uav.position.y / world.mapSize.height * height);
        for (const p of engine.plannedPath) ctx.lineTo(p.x / world.mapSize.width * width, p.y / world.mapSize.height * height);
        ctx.stroke(); ctx.restore();
      }
      // 7. Draw active UAV
      if (currentRecord) {
        drawUAV(
          ctx,
          width,
          height,
          world,
          currentRecord.uav.position,
          currentRecord.uav.headingRad,
          currentRecord.comm.linkState
        );
      }

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameId);
  }, [engine, world, currentRecord, historyRecords, isHeatmapVisible, isGhostVisible, coverageGrid]);

  // Handle canvas resize
  useEffect(() => {
    const updateSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      const ratio = world.mapSize.width / world.mapSize.height;
      const width = Math.min(rect.width, (rect.height || 600) * ratio);
      canvas.width = width;
      canvas.height = width / ratio;
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [world.mapSize.width, world.mapSize.height]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (rect.width <= 0 || rect.height <= 0) return;
    const mapX = (px / rect.width) * world.mapSize.width;
    const mapY = (py / rect.height) * world.mapSize.height;

    const commRes = computeCommState({ x: mapX, y: mapY }, world, null, engine.shadowNoiseMap);
    setHoverInfo({
      x: Math.round(mapX),
      y: Math.round(mapY),
      q: Math.round(commRes.comm.linkQuality * 100),
    });
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-slate-950/80 rounded-card border border-border-subtle overflow-hidden">
      <div className="absolute top-4 left-4 text-[9px] font-mono tracking-widest text-slate-400 pointer-events-none">LOCAL SIMULATION / {world.mapSize.width} × {world.mapSize.height} m</div>
      <div className="absolute bottom-4 left-4 right-4 flex justify-between text-[9px] font-mono text-slate-400 pointer-events-none"><span>◎ GROUND STATION · ◇ OBJECTIVE</span><span>RF QUALITY: LOW → HIGH</span></div>
      <canvas
        ref={canvasRef}
        role="img" aria-label="Live simulated drone position, ground stations, mission waypoints and RF coverage map"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverInfo(null)}
        className="cursor-crosshair rounded-card shadow-2xl"
      />

      {/* Hover Info Tooltip */}
      {hoverInfo && (
        <div className="absolute top-4 left-4 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-control text-xs font-mono text-slate-200 pointer-events-none shadow-lg backdrop-blur-md">
          <span>
            Pos ({hoverInfo.x}m, {hoverInfo.y}m) | Estimated Q: {hoverInfo.q}%
          </span>
        </div>
      )}
    </div>
  );
};
