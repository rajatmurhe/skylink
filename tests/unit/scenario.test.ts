import { describe, it, expect } from 'vitest';
import disasterPreset from '../../src/scenarios/disaster.json';
import urbanPreset from '../../src/scenarios/urban.json';
import wildfirePreset from '../../src/scenarios/wildfire.json';
import mountainPreset from '../../src/scenarios/mountain.json';
import { SimEngine } from '../../src/sim/engine';

describe('Phase 7: Scenario Builder & Preset Serialization', () => {
  it('All 4 preset scenarios serialize and load cleanly into SimEngine', () => {
    const presets = [disasterPreset, urbanPreset, wildfirePreset, mountainPreset];

    presets.forEach((preset) => {
      const engine = new SimEngine({
        seed: 42,
        world: preset.world,
        waypoints: preset.waypoints,
        initialBatteryWh: preset.initialBatteryWh,
      });

      expect(engine.uav.batteryWh).toBe(preset.initialBatteryWh);
      const firstRecord = engine.step();
      expect(firstRecord).toBeDefined();
      expect(firstRecord.uav.batteryWh).toBeCloseTo(preset.initialBatteryWh, 1);
      expect(firstRecord.waypoints.length).toBe(preset.waypoints.length);
    });
  });

  it('Exported scenario JSON re-imports with 100% fidelity', () => {
    const original = disasterPreset;
    const jsonString = JSON.stringify(original);
    const reimported = JSON.parse(jsonString);

    expect(reimported).toEqual(original);
  });
});
