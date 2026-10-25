import { describe, it, expect } from 'vitest';
import { SimEngine } from '../../src/sim/engine';

describe('Phase 9: Headless Batch Benchmark Engine', () => {
  it('Executes 50 multi seed runs and computes non negative statistics', () => {
    const numRuns = 50;
    const values: number[] = [];

    for (let i = 0; i < numRuns; i++) {
      const engine = new SimEngine({ seed: 5000 + i });
      const records = engine.runHeadless(100);
      const summary = engine.recorder.getSummary();
      values.push(summary?.capturedValue || 0);
      expect(records.length).toBe(100);
    }

    const mean = values.reduce((a, b) => a + b, 0) / numRuns;
    expect(mean).toBeGreaterThanOrEqual(0);
  });
});
