import React, { useState, useEffect } from 'react';
import { SimEngine } from '../sim/engine';
import { useSimStore } from '../store/simStore';

import { Card } from '../ui/components/Card';
import { Pill } from '../ui/components/Pill';
import { StatTile } from '../ui/components/StatTile';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Trophy,
  GitCompare,
  Dices,
} from 'lucide-react';
import {
  drawTerrainGrid,
  drawObstaclesAndJammers,
  drawTowers,
  drawWaypoints,
  drawFlightTrail,
  drawUAV,
} from '../ui/canvas/renderers';

export const Compare: React.FC = () => {
  const scenario = useSimStore(s=>s.scenario);
  const selectedSeed = useSimStore(s=>s.seed);
  const options = { world: scenario?.world, waypoints: scenario?.waypoints, initialBatteryWh: scenario?.initialBatteryWh };
  const [seed, setSeed] = useState(selectedSeed);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier] = useState(1);
  const [tickCount, setTickCount] = useState(0);

  // Synced Engines
  const [engineBase, setEngineBase] = useState(() => new SimEngine({ ...options, seed: selectedSeed, strategy: 'baseline' }));
  const [engineSky, setEngineSky] = useState(() => new SimEngine({ ...options, seed: selectedSeed }));

  const canvasRefBase = React.useRef<HTMLCanvasElement | null>(null);
  const canvasRefSky = React.useRef<HTMLCanvasElement | null>(null);

  const resetComparison = (newSeed = seed) => {
    setIsPlaying(false);
    setTickCount(0);
    setSeed(newSeed);


    const eb = new SimEngine({ ...options, seed: newSeed, strategy: 'baseline' });
    const es = new SimEngine({ ...options, seed: newSeed });
    setEngineBase(eb);
    setEngineSky(es);
  };

  useEffect(() => { resetComparison(selectedSeed); }, [scenario, selectedSeed]);

  const stepBoth = () => {
    if (!engineBase.finished) engineBase.step();
    if (!engineSky.finished) engineSky.step();
    setTickCount(Math.max(engineBase.tick, engineSky.tick));
    if ((engineBase.finished && engineSky.finished) || Math.max(engineBase.tick, engineSky.tick) >= 6000) setIsPlaying(false);
  };
  const runToEnd = () => {
    setIsPlaying(false);
    for (let i = Math.max(engineBase.tick, engineSky.tick); i < 6000; i++) {
      if (!engineBase.finished) engineBase.step();
      if (!engineSky.finished) engineSky.step();
      if (engineBase.finished && engineSky.finished) break;
    }
    setTickCount(Math.max(engineBase.tick, engineSky.tick));
  };

  // Synchronized playback loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      const intervalMs = Math.max(12, 100 / speedMultiplier);
      timer = setInterval(() => {
        stepBoth();
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, speedMultiplier, engineBase, engineSky]);

  // Render both canvas maps
  useEffect(() => {
    const renderCanvas = (
      canvas: HTMLCanvasElement | null,
      engine: SimEngine,
      isSky: boolean
    ) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = Math.min(canvas.parentElement?.clientWidth ?? 440, 440);
      canvas.width = size; canvas.height = size;
      const w = canvas.width;
      const h = canvas.height;

      drawTerrainGrid(ctx, w, h, engine.world);
      drawObstaclesAndJammers(ctx, w, h, engine.world);
      drawTowers(ctx, w, h, engine.world, performance.now());
      drawWaypoints(ctx, w, h, engine.world, engine.waypoints);
      drawFlightTrail(ctx, w, h, engine.world, engine.recorder.getRecords());

      const lastRec = engine.recorder.getRecords().slice(-1)[0];
      if (lastRec) {
        drawUAV(
          ctx,
          w,
          h,
          engine.world,
          lastRec.uav.position,
          lastRec.uav.headingRad,
          isSky ? lastRec.comm.linkState : 'GOOD'
        );
      }
    };

    renderCanvas(canvasRefBase.current, engineBase, false);
    renderCanvas(canvasRefSky.current, engineSky, true);
  }, [tickCount, engineBase, engineSky]);

  const outcome = (engine: SimEngine) => engine.uav.batteryWh <= 0 ? 'Battery depleted' : engine.finished ? (engine.waypoints.every(w=>w.captured) ? 'Completed and returned home' : 'Returned home · partial mission') : tickCount >= 6000 ? 'Evaluation limit reached · not landed' : tickCount ? 'In progress' : 'Ready';

  const summaryBase = engineBase.recorder.getSummary();
  const summarySky = engineSky.recorder.getSummary();

  const valBase = summaryBase?.capturedValue || 0;
  const totVal = engineBase.waypoints.reduce((sum,w)=>sum+w.value,0) || 1;
  const valSky = summarySky?.capturedValue || 0;

  const pctBase = Math.round((valBase / totVal) * 100);
  const pctSky = Math.round((valSky / totVal) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {/* Top Header Controls */}
      <header className="glass-panel-raised p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-accent-cyan" />
          <h1 className="font-heading text-xl font-bold text-slate-100">
            Side by Side Synchronized Strategy Comparison
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled={(engineBase.finished && engineSky.finished) || tickCount >= 6000}
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-2 px-4 py-2 rounded-control bg-accent-cyan text-slate-950 font-bold text-xs shadow-glow hover:bg-cyan-400 transition-all"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Play Synced Run'}</span>
          </button>

          <button
            disabled={(engineBase.finished && engineSky.finished) || tickCount >= 6000}
            onClick={runToEnd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-control bg-violet-600 hover:bg-violet-500 text-slate-100 font-bold text-xs transition-all shadow-glow"
          >
            <FastForward className="w-4 h-4" />
            <span>Run to End</span>
          </button>

          <button
            onClick={() => resetComparison()}
            className="p-2 rounded-control bg-slate-800 hover:bg-slate-700 text-slate-200 border border-border-subtle"
            title="Reset Both Engines"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 bg-slate-900/80 px-3 py-1 rounded-control border border-border-subtle text-xs font-mono">
            <Dices className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">Seed:</span>
            <input
              type="number"
              value={seed}
              onChange={(e) => resetComparison(Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : 42)}
              className="w-16 bg-slate-950 text-cyan-300 font-bold border border-slate-800 rounded px-1"
            />
          </div>
        </div>
      </header>

      <p className="text-sm text-slate-400">Environment: {scenario?.name ?? 'Default training environment'}. Both strategies use identical geometry, objectives, battery and radio seed; baseline follows direct waypoint legs while SkyLink uses communication-aware A*. Runs stop at landing, battery depletion or a 600-second evaluation limit. A partial mission is a valid outcome, not evidence of success.</p>
      {/* Dynamic Verdict Banner */}
      <div className="glass-panel-raised p-4 flex items-center justify-between border-accent-cyan/40 bg-slate-900/90 shadow-glow">
        <div className="flex flex-wrap items-center gap-3">
          <Trophy className="w-6 h-6 text-amber-400 " />
          <div className="flex flex-col">
            <span className="font-heading font-extrabold text-slate-100 text-base">
              Observed mission value:
            </span>
            <span className="text-sm font-semibold text-cyan-300">
              SkyLink captured {pctSky} percent of mission value, while baseline captured {pctBase} percent.
            </span>
          </div>
        </div>
        <div className="font-mono text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-control border border-border-subtle">
          Time: {(tickCount * 0.1).toFixed(1)}s (Shared Seed {seed})
        </div>
      </div>

      {/* Dual Synced Canvas Map Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Baseline Strategy Card */}
        <Card
          header={
            <div className="flex items-center justify-between w-full">
              <span className="font-heading font-bold text-slate-200">Baseline Strategy</span>
              <Pill type="baseline" label="Static Pre-planned Path" />
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="h-[440px] flex items-center justify-center bg-slate-950 rounded-card overflow-hidden">
              <canvas ref={canvasRefBase} className="shadow-2xl" />
            </div>

            <p className="text-xs text-slate-300">{outcome(engineBase)} · {(engineBase.tick / 10).toFixed(1)} s</p>
            <div className="grid grid-cols-3 gap-2">
              <StatTile label="Value Captured" value={`${valBase} / ${totVal}`} unit="pts" />
              <StatTile label="Outage Duration" value={summaryBase?.totalOutageSeconds.toFixed(1) || '0.0'} unit="s" color="text-rose-400" />
              <StatTile label="Remaining Energy" value={engineBase.uav.batteryWh.toFixed(1)} unit="Wh" color="text-amber-400" />
            </div>
          </div>
        </Card>

        {/* SkyLink Strategy Card */}
        <Card
          header={
            <div className="flex items-center justify-between w-full">
              <span className="font-heading font-bold text-cyan-300">SkyLink Strategy</span>
              <Pill type="skylink" label="Communication Aware Adaptive" />
            </div>
          }
          variant="raised"
        >
          <div className="flex flex-col gap-4">
            <div className="h-[440px] flex items-center justify-center bg-slate-950 rounded-card overflow-hidden">
              <canvas ref={canvasRefSky} className="shadow-2xl" />
            </div>

            <p className="text-xs text-slate-300">{outcome(engineSky)} · {(engineSky.tick / 10).toFixed(1)} s</p>
            <div className="grid grid-cols-3 gap-2">
              <StatTile label="Value Captured" value={`${valSky} / ${totVal}`} unit="pts" color="text-teal-300" />
              <StatTile label="Outage Duration" value={summarySky?.totalOutageSeconds.toFixed(1) || '0.0'} unit="s" color="text-teal-300" />
              <StatTile label="Remaining Energy" value={engineSky.uav.batteryWh.toFixed(1)} unit="Wh" color="text-amber-400" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
