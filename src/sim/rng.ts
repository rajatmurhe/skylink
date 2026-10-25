/**
 * Mulberry32 seeded pseudo random number generator.
 * Provides fast, deterministic, reproducible pseudo random values.
 */
export interface SeededRNG {
  next: () => number; // Returns float in [0, 1)
  nextRange: (min: number, max: number) => number;
  nextInt: (min: number, max: number) => number;
  nextGaussian: (mean?: number, stdDev?: number) => number;
}

export function createRNG(seed: number): SeededRNG {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const nextRange = (min: number, max: number): number => {
    return min + (max - min) * next();
  };

  const nextInt = (min: number, max: number): number => {
    return Math.floor(nextRange(min, max + 1));
  };

  // Box-Muller transform for Gaussian distribution
  const nextGaussian = (mean = 0, stdDev = 1): number => {
    let u1 = 0;
    let u2 = 0;
    while (u1 === 0) u1 = next();
    while (u2 === 0) u2 = next();

    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  };

  return {
    next,
    nextRange,
    nextInt,
    nextGaussian,
  };
}
