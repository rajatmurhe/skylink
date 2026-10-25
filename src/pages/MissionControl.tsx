import React, { useEffect, useState } from 'react';
import { useSimStore } from '../store/simStore';
import { useUIStore, StrategyType } from '../store/uiStore';
import { ScenarioGenerator } from '../ui/components/ScenarioGenerator';
import { SimCanvas } from '../ui/canvas/SimCanvas';
import { Card } from '../ui/components/Card';
import { Gauge } from '../ui/components/Gauge';
import { Pill } from '../ui/components/Pill';
import { Sparkline } from '../ui/components/Sparkline';
import { StatTile } from '../ui/components/StatTile';
import { Toggle } from '../ui/components/Toggle';
import { LoopRibbon, LoopStage } from '../ui/components/LoopRibbon';
import { DecisionPanel } from '../ui/components/DecisionPanel';
import { TimelineScrubber } from '../ui/components/TimelineScrubber';
import { StressLab } from '../ui/components/StressLab';
import {
  Play,
  Pause,
  RotateCcw,
  Dices,
  Radio,
  BatteryCharging,
  Target,
  StepForward,
} from 'lucide-react';

export const MissionControl: React.FC = () => {
  const {
    engine,
    scenario,
    isPlaying,
    speedMultiplier,
    seed,
    currentRecord,
    historyRecords,
    isHeatmapVisible,
    play,
    pause,
    stepTick,
    reset,
    setSpeed,
    setSeed,
    toggleHeatmap,
  } = useSimStore();

  const [checks,setChecks] = useState<string[]>([]);
  const checklist = ['Airframe, propellers and motor directions reviewed', 'Battery reserve and home position reviewed', 'Mission waypoints and uplink requirements reviewed', 'Failsafe and operating-area assumptions reviewed'];
  const ready = checks.length === checklist.length;
  const { activeStrategy, setActiveStrategy } = useUIStore();

  useEffect(() => { pause(); return () => pause(); }, [pause]);

  useEffect(() => { setChecks([]); pause(); }, [scenario, pause]);

  // Playback timer loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && ready) {
      const intervalMs = Math.max(12, 100 / speedMultiplier);
      timer = setInterval(() => {
        stepTick();
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, ready, speedMultiplier, stepTick]);

  const sparklineData = historyRecords.slice(-300).map((r) => r.comm.linkQuality);

  const comm = currentRecord?.comm;
  const uav = currentRecord?.uav;
  const waypoints = currentRecord?.waypoints || [];
  const risk = currentRecord?.risk;

  const capturedVal = waypoints.filter((w) => w.captured).reduce((a, b) => a + b.value, 0);
  const totalVal = waypoints.reduce((a, b) => a + b.value, 0);

  // Compute active loop stage for ribbon
  let activeStage: LoopStage = 'sense';
  if (currentRecord) {
    if (currentRecord.decision.action === 'RECOVER_CONNECTIVITY') activeStage = 'recover';
    else if (currentRecord.decision.action === 'RESUME') activeStage = 'resume';
    else if (currentRecord.comm.linkState === 'DEGRADING') activeStage = 'assess';
    else if (currentRecord.decision.action === 'REPLAN') activeStage = 'decide';
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      <div className="page-heading"><div><span className="eyebrow">FLIGHT OPERATIONS / SIMULATOR</span><h1>Mission control<span className="text-accent-cyan">.</span></h1><p>Observe the link. Understand the decision. Follow the recovery.</p></div><span className="status-chip">{engine.finished ? 'RUN FINISHED' : isPlaying ? 'SIMULATION RUNNING' : 'SIMULATION PAUSED'}</span></div>
      <ScenarioGenerator />
      <Card header="Preflight briefing" action={<span className="text-xs text-accent-cyan">{checks.length}/4 reviewed · simulation checklist</span>}>
        <div className="grid sm:grid-cols-2 gap-3">{checklist.map(item=><label key={item} className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer"><input type="checkbox" checked={checks.includes(item)} onChange={e=>{setChecks(c=>e.target.checked?[...c,item]:c.filter(x=>x!==item)); if(!e.target.checked) pause();}} className="accent-green-300 w-4 h-4"/>{item}</label>)}</div>
        <p className="text-xs text-slate-500 mt-4">Review these items to enable mission playback. This is an educational briefing, not aircraft inspection or real-flight authorization.</p>
      </Card>
      {/* Top Playback & Controls Bar */}
      <header className="glass-panel-raised p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Strategy Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-control border border-border-subtle">
            {(['baseline', 'skylink_utility'] as StrategyType[]).map((strat) => (
              <button
                key={strat}
                onClick={() => { setActiveStrategy(strat); reset(); }}
                className={`px-3 py-1.5 rounded-control text-xs font-semibold transition-all ${
                  activeStrategy === strat
                    ? 'bg-accent-cyan text-slate-950 shadow-glow font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {strat === 'baseline'
                  ? 'Baseline Strategy'
                  : strat === 'skylink_utility'
                  ? 'SkyLink Utility'
                  : 'SkyLink RL Agent'}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Playback Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={engine.finished || !ready}
            onClick={isPlaying ? pause : play}
            className="flex items-center gap-2 px-5 py-2 rounded-control bg-accent-cyan hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-glow"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Play Simulation</span>
              </>
            )}
          </button>

          <button
            onClick={stepTick}
            disabled={isPlaying || engine.finished || !ready}
            className="p-2 rounded-control bg-slate-800 hover:bg-slate-700 text-slate-200 border border-border-subtle disabled:opacity-50"
            title="Step Single Tick"
          >
            <StepForward className="w-4 h-4" />
          </button>

          <button
            onClick={() => reset()}
            className="p-2 rounded-control bg-slate-800 hover:bg-slate-700 text-slate-200 border border-border-subtle"
            title="Reset Simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Speed Select */}
          <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded-control border border-border-subtle text-xs">
            <span className="text-slate-400 font-medium mr-1">Speed:</span>
            {[0.5, 1, 2, 4, 8].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-all ${
                  speedMultiplier === s
                    ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Right: Seed & Heatmap Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1 rounded-control border border-border-subtle text-xs">
            <Dices className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400 font-medium">Radio seed:</span>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : 42)}
              className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 font-mono text-cyan-300 font-bold focus:outline-none focus:border-cyan-400"
            />
            <button
              onClick={() => reset(Math.floor(Math.random() * 100000))}
              className="text-slate-400 hover:text-cyan-300 text-xs ml-1"
              title="Randomize radio conditions without changing map geometry"
            >
              Random
            </button>
          </div>

          <Toggle
            label="Heatmap"
            checked={isHeatmapVisible}
            onChange={toggleHeatmap}
          />
        </div>
      </header>

      {engine.finished && <div role="status" className="glass-panel p-4 text-sm text-accent-cyan">{engine.uav.batteryWh <= 0 ? 'Run ended: battery depleted.' : engine.waypoints.every(w=>w.captured) ? 'Mission complete. All objectives captured and the drone returned home.' : 'Drone returned home with a partial mission. Review the decisions or reset to try another strategy.'}</div>}
      {/* Active Loop Ribbon Bar */}
      <LoopRibbon activeStage={activeStage} />

      {/* Main Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Canvas Viewport & Replay Timeline */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="h-[520px]">
            <SimCanvas />
          </div>

          {/* Scrubbable Timeline */}
          <TimelineScrubber canPlay={ready} />
          <Card header="Mission objectives" action={<span className="text-xs text-accent-cyan">{waypoints.filter(w=>w.captured).length} / {waypoints.length} captured</span>}>
            <div className="divide-y divide-border-subtle">{waypoints.map((w,i)=><div key={w.id} className="flex items-center gap-4 py-4"><span className="font-mono text-xs text-slate-500">{String(i+1).padStart(2,'0')}</span><div className="flex-1"><div className="text-sm text-slate-200">{w.name}</div><p className="text-xs text-slate-500 mt-1">{w.value} mission points · {w.needsUplink ? 'Requires link quality ≥ 50%' : 'Position capture'}{w.deadlineSeconds !== undefined ? ` · deadline ${w.deadlineSeconds}s` : ''}</p></div><span className={`text-[10px] font-mono ${w.captured ? 'text-accent-cyan' : 'text-slate-400'}`}>{w.captured ? 'CAPTURED' : w.deferredReason ? 'DEFERRED' : w.deadlineSeconds !== undefined && (currentRecord?.timeSeconds ?? 0) > w.deadlineSeconds ? 'EXPIRED' : 'PENDING'}</span></div>)}</div>
          </Card>
          <Card header="Decision event log">
            <div className="max-h-64 overflow-y-auto space-y-3">{historyRecords.filter((r,i)=>r.tick <= (currentRecord?.tick ?? Infinity) && (i===0 || r.decision.action!==historyRecords[i-1].decision.action || r.comm.linkState!==historyRecords[i-1].comm.linkState)).slice(-12).reverse().map(r=><div key={r.tick} className="flex gap-4 text-xs border-b border-border-subtle pb-3"><span className="font-mono text-slate-500 shrink-0">{r.timeSeconds.toFixed(1)}s</span><div><span className="text-accent-cyan font-mono">{r.decision.action} / {r.comm.linkState}</span><p className="text-slate-400 mt-1 leading-relaxed">{r.decision.explanation}</p></div></div>)}</div>
          </Card>
        </div>

        {/* Right Column: Telemetry Dashboard & Stress Lab */}
        <div className="flex flex-col gap-5">
          {/* Card 1: Link Health & Physics */}
          <Card
            header={
              <div className="flex flex-wrap items-center gap-2">
                <Radio className="w-4 h-4 text-accent-cyan" />
                <span>Link Health & RF Model</span>
              </div>
            }
            action={
              comm && (
                <Pill
                  type={
                    comm.linkState === 'GOOD'
                      ? 'good'
                      : comm.linkState === 'DEGRADING'
                      ? 'degrading'
                      : comm.linkState === 'POOR'
                      ? 'poor'
                      : 'outage'
                  }
                />
              )
            }
          >
            <div className="flex items-center justify-between gap-4">
              <Gauge
                value={Math.round((comm?.linkQuality || 0) * 100)}
                label="Current Link Quality Q"
                sublabel="SINR"
                color={
                  comm?.linkState === 'GOOD'
                    ? 'var(--color-link-good)'
                    : comm?.linkState === 'DEGRADING'
                    ? 'var(--color-link-degrading)'
                    : comm?.linkState === 'POOR'
                    ? 'var(--color-link-poor)'
                    : 'var(--color-link-outage)'
                }
              />
              <div className="flex flex-col gap-2 flex-1">
                <div className="text-xs font-semibold text-slate-300">
                  30s Signal Trend History:
                </div>
                <Sparkline data={sparklineData} width={180} height={45} />
                <div className="text-[11px] text-cyan-300 font-mono">
                  Predicted Q in 5s: {Math.round((comm?.predictedLinkQuality || 0) * 100)}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border-subtle">
              <StatTile label="RSSI" value={comm?.rssiDbm || -150} unit="dBm" />
              <StatTile label="Packet Loss" value={Math.round((comm?.packetLossProb || 0) * 100)} unit="%" />
              <StatTile label="Latency" value={comm?.latencyMs || 0} unit="ms" />
            </div>
          </Card>

          {/* Card 2: Mission Progress */}
          <Card
            header={
              <div className="flex flex-wrap items-center gap-2">
                <Target className="w-4 h-4 text-violet-400" />
                <span>Mission Progress & Value</span>
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label="Value Captured"
                value={`${capturedVal} / ${totalVal}`}
                unit="pts"
                color="text-teal-300"
              />
              <StatTile
                label="Criticality"
                value={Math.round((risk?.missionCriticality || 0) * 100)}
                unit="%"
                color="text-violet-300"
              />
            </div>
          </Card>

          {/* Card 3: Energy & Return Reserve */}
          <Card
            header={
              <div className="flex flex-wrap items-center gap-2">
                <BatteryCharging className="w-4 h-4 text-amber-400" />
                <span>Energy & Return Reserve</span>
              </div>
            }
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-semibold">Battery State:</span>
                <span className="text-amber-400 font-bold">
                  {uav?.batteryWh.toFixed(1)} Wh / {uav?.maxBatteryWh} Wh
                </span>
              </div>

              <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${Math.max(0, (uav?.batteryWh || 0) / (uav?.maxBatteryWh || 100) * 100)}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10"
                  style={{ left: `${Math.min(100, (uav?.returnReserveWh || 0) / (uav?.maxBatteryWh || 100) * 100)}%` }}
                  title="Return Reserve Threshold"
                />
              </div>

              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>Reserve: {uav?.returnReserveWh.toFixed(1)} Wh</span>
                <span>Margin: {risk?.batteryMarginWh.toFixed(1)} Wh</span>
              </div>
            </div>
          </Card>

          {/* Card 4: Decision Engine Utility Scores & Explanation */}
          <DecisionPanel />

          {/* Card 5: Stress Lab Injection Tools */}
          <StressLab />
        </div>
      </div>
    </div>
  );
};
