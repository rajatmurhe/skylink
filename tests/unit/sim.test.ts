import { describe, it, expect } from 'vitest';
import { createRNG } from '../../src/sim/rng';
import { SimEngine } from '../../src/sim/engine';
import { calculatePowerDrawW } from '../../src/sim/uav';

describe('Phase 1: Pure Deterministic Simulation Core', () => {
  it(' Mulberry32 PRNG produces identical sequence for same seed', () => {
    const rng1 = createRNG(12345);
    const rng2 = createRNG(12345);

    const seq1 = Array.from({ length: 100 }, () => rng1.next());
    const seq2 = Array.from({ length: 100 }, () => rng2.next());

    expect(seq1).toEqual(seq2);
  });

  it('UAV power draw increases with speed squared', () => {
    const hoverPower = calculatePowerDrawW(0);
    const cruisePower = calculatePowerDrawW(10);
    const maxSpeedPower = calculatePowerDrawW(15);

    expect(hoverPower).toBe(150);
    expect(cruisePower).toBeGreaterThan(hoverPower);
    expect(maxSpeedPower).toBeGreaterThan(cruisePower);
  });

  it('SimEngine execution is 100% deterministic with identical seed', () => {
    const engine1 = new SimEngine({ seed: 999 });
    const engine2 = new SimEngine({ seed: 999 });

    const records1 = engine1.runHeadless(500);
    const records2 = engine2.runHeadless(500);

    expect(records1.length).toBe(500);
    expect(records2.length).toBe(500);
    expect(records1).toEqual(records2);
  });

  it('Runs 1000 headless simulation ticks in well under 1 second', () => {
    const engine = new SimEngine({ seed: 42 });
    const startTime = performance.now();

    const records = engine.runHeadless(1000);
    const endTime = performance.now();
    const durationMs = endTime - startTime;

    expect(records.length).toBe(1000);
    expect(durationMs).toBeLessThan(1000); // Must be well under 1 second
  });
});
