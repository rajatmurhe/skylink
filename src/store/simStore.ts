import { useUIStore } from './uiStore';
import { create } from 'zustand';
import { SimEngine } from '../sim/engine';
import { TickRecord, Scenario } from '../types/sim';

interface SimStoreState {
  scenario: Scenario | null;
  engine: SimEngine;
  isPlaying: boolean;
  speedMultiplier: number;
  seed: number;
  currentRecord: TickRecord | null;
  historyRecords: TickRecord[];
  isHeatmapVisible: boolean;
  isGhostVisible: boolean;

  play: () => void;
  pause: () => void;
  stepTick: () => void;
  reset: (newSeed?: number) => void;
  setSpeed: (speed: number) => void;
  setSeed: (seed: number) => void;
  toggleHeatmap: () => void;
  toggleGhost: () => void;
  loadScenario: (scenario: Scenario) => void;
}

export const useSimStore = create<SimStoreState>((set, get) => {
  const initialSeed = 42;
  const initialEngine = new SimEngine({ seed: initialSeed });
  const firstRecord = initialEngine.step();

  return {
    scenario: null,
    engine: initialEngine,
    isPlaying: false,
    speedMultiplier: 1.0,
    seed: initialSeed,
    currentRecord: firstRecord,
    historyRecords: [firstRecord],
    isHeatmapVisible: true,
    isGhostVisible: true,

    play: () => set({ isPlaying: !get().engine.finished }),
    pause: () => set({ isPlaying: false }),

    stepTick: () => {
      const { engine, isPlaying } = get();
      engine.strategy = useUIStore.getState().activeStrategy === 'baseline' ? 'baseline' : 'skylink_utility';
      const nextRecord = engine.step();
      if (nextRecord.tick === get().historyRecords.at(-1)?.tick) { set({ isPlaying: false }); return; }
      set((state) => ({
        currentRecord: nextRecord,
        historyRecords: [...state.historyRecords, nextRecord],
        // Stop automatically if battery depleted or mission complete & drone home
        isPlaying:
          engine.finished
            ? false
            : isPlaying,
      }));
    },

    reset: (newSeed) => {
      const targetSeed = newSeed ?? get().seed;
      const newEngine = new SimEngine({ seed: targetSeed, strategy: useUIStore.getState().activeStrategy === 'baseline' ? 'baseline' : 'skylink_utility', ...(get().scenario ? { world: get().scenario!.world, waypoints: get().scenario!.waypoints, initialBatteryWh: get().scenario!.initialBatteryWh } : {}) });
      const record = newEngine.step();
      set({
        engine: newEngine,
        isPlaying: false,
        seed: targetSeed,
        currentRecord: record,
        historyRecords: [record],
      });
    },

    setSpeed: (speedMultiplier) => set({ speedMultiplier }),
    setSeed: (seed) => get().reset(seed),
    toggleHeatmap: () => set((state) => ({ isHeatmapVisible: !state.isHeatmapVisible })),
    toggleGhost: () => set((state) => ({ isGhostVisible: !state.isGhostVisible })),

    loadScenario: (scenario) => {
      const newEngine = new SimEngine({
        seed: get().seed,
        strategy: useUIStore.getState().activeStrategy === 'baseline' ? 'baseline' : 'skylink_utility',
        world: scenario.world,
        waypoints: scenario.waypoints,
        initialBatteryWh: scenario.initialBatteryWh,
      });
      const record = newEngine.step();
      set({
        scenario: structuredClone(scenario),
        engine: newEngine,
        isPlaying: false,
        currentRecord: record,
        historyRecords: [record],
      });
    },
  };
});
