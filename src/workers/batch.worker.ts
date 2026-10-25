import { SimEngine } from '../sim/engine';
import { BaselineDecisionEngine } from '../decision/baseline';
import { DecisionStateMachine } from '../decision/state_machine';
import disasterPreset from '../scenarios/disaster.json';

export interface BatchRunConfig {
  numRuns: number; // e.g. 100
  startSeed: number; // e.g. 5000 (test seeds)
  strategies: ('baseline' | 'skylink_utility')[];
}

export interface SingleRunResult {
  seed: number;
  strategy: string;
  capturedValue: number;
  totalValue: number;
  outageSeconds: number;
  batteryUsedWh: number;
  isCompleted: boolean;
  isSafeReturn: boolean;
}

export interface StrategyStats {
  strategy: string;
  numRuns: number;
  completionRatePct: number;
  meanValueCaptured: number;
  ciValueCaptured: number; // 95% CI radius
  meanOutageSeconds: number;
  ciOutageSeconds: number;
  meanEnergyWh: number;
  safeReturnSuccessPct: number;
}

self.onmessage = (e: MessageEvent) => {
  const config: BatchRunConfig = e.data;
  const numRuns = config.numRuns ?? 100;
  const startSeed = config.startSeed ?? 5000;

  const rawResults: SingleRunResult[] = [];

  config.strategies.forEach((strat) => {
    const baseDec = new BaselineDecisionEngine();
    const skyState = new DecisionStateMachine();

    for (let i = 0; i < numRuns; i++) {
      const seed = startSeed + i;
      baseDec.reset();
      skyState.reset();

      const engine = new SimEngine({
        seed,
        strategy: strat,
        world: disasterPreset.world,
        waypoints: disasterPreset.waypoints,
        initialBatteryWh: disasterPreset.initialBatteryWh,
      });

      let tickCount = 0;
      while (tickCount < 6000 && !engine.finished) {
        tickCount++;
        const rec = engine.step();

        if (rec.uav.isHome && rec.waypoints.every((w) => w.captured)) {
          break;
        }
      }

      const summary = engine.recorder.getSummary();
      const isCompleted = engine.waypoints.every((w) => w.captured);

      rawResults.push({
        seed,
        strategy: strat,
        capturedValue: summary?.capturedValue || 0,
        totalValue: summary?.totalValue || 23,
        outageSeconds: parseFloat((summary?.totalOutageSeconds || 0).toFixed(1)),
        batteryUsedWh: parseFloat((engine.uav.maxBatteryWh - engine.uav.batteryWh).toFixed(1)),
        isCompleted,
        isSafeReturn: engine.finished && engine.uav.isHome && engine.uav.batteryWh > 0,
      });
    }

    // Post progress
    self.postMessage({
      type: 'PROGRESS',
      completedStrategy: strat,
      totalRuns: numRuns * config.strategies.length,
    });
  });

  // Calculate 95% confidence intervals and stats
  const stats: StrategyStats[] = config.strategies.map((strat) => {
    const stratRuns = rawResults.filter((r) => r.strategy === strat);
    const n = stratRuns.length;

    const completed = stratRuns.filter((r) => r.isCompleted).length;
    const safeReturns = stratRuns.filter((r) => r.isSafeReturn).length;

    const values = stratRuns.map((r) => r.capturedValue);
    const meanVal = values.reduce((a, b) => a + b, 0) / n;
    const stdVal = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - meanVal, 2), 0) / Math.max(1, n - 1));
    const ciVal = 1.96 * (stdVal / Math.sqrt(n));

    const outages = stratRuns.map((r) => r.outageSeconds);
    const meanOut = outages.reduce((a, b) => a + b, 0) / n;
    const stdOut = Math.sqrt(outages.reduce((a, b) => a + Math.pow(b - meanOut, 2), 0) / Math.max(1, n - 1));
    const ciOut = 1.96 * (stdOut / Math.sqrt(n));

    const energies = stratRuns.map((r) => r.batteryUsedWh);
    const meanEnergy = energies.reduce((a, b) => a + b, 0) / n;

    return {
      strategy: strat,
      numRuns: n,
      completionRatePct: parseFloat(((completed / n) * 100).toFixed(1)),
      meanValueCaptured: parseFloat(meanVal.toFixed(2)),
      ciValueCaptured: parseFloat(ciVal.toFixed(2)),
      meanOutageSeconds: parseFloat(meanOut.toFixed(1)),
      ciOutageSeconds: parseFloat(ciOut.toFixed(1)),
      meanEnergyWh: parseFloat(meanEnergy.toFixed(1)),
      safeReturnSuccessPct: parseFloat(((safeReturns / n) * 100).toFixed(1)),
    };
  });

  self.postMessage({ type: 'COMPLETE', stats, rawResults });
};
