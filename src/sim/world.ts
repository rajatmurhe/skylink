import { WorldState } from '../types/sim';
import { SeededRNG } from './rng';

/**
 * 2D Seeded Value Noise generator for organic RF shadowing.
 */
export function create2DNoise(rng: SeededRNG, gridWidth = 32, gridHeight = 32) {
  const grid: number[][] = [];
  for (let y = 0; y < gridHeight; y++) {
    const row: number[] = [];
    for (let x = 0; x < gridWidth; x++) {
      row.push(rng.next());
    }
    grid.push(row);
  }

  const smoothstep = (t: number) => t * t * (3 - 2 * t);

  return function getNoise(x: number, y: number): number {
    // Normalize x, y to grid coordinates
    const gx = Math.max(0, Math.min(gridWidth - 1.001, x * (gridWidth - 1)));
    const gy = Math.max(0, Math.min(gridHeight - 1.001, y * (gridHeight - 1)));

    const x0 = Math.floor(gx);
    const x1 = x0 + 1;
    const y0 = Math.floor(gy);
    const y1 = y0 + 1;

    const sx = smoothstep(gx - x0);
    const sy = smoothstep(gy - y0);

    const n0 = grid[y0][x0] * (1 - sx) + grid[y0][x1] * sx;
    const n1 = grid[y1][x0] * (1 - sx) + grid[y1][x1] * sx;

    return n0 * (1 - sy) + n1 * sy;
  };
}

export function createDefaultWorld(): WorldState {
  return {
    mapSize: { width: 2000, height: 2000 },
    homePosition: { x: 200, y: 200 },
    geofence: { xMin: 0, xMax: 2000, yMin: 0, yMax: 2000 },
    towers: [
      {
        id: 'tower_alpha',
        name: 'Tower Alpha',
        position: { x: 300, y: 400 },
        txPowerDbm: 33,
        height: 30,
        loadFactor: 0.2,
        isOnline: true,
      },
      {
        id: 'tower_bravo',
        name: 'Tower Bravo',
        position: { x: 1000, y: 1100 },
        txPowerDbm: 33,
        height: 30,
        loadFactor: 0.3,
        isOnline: true,
      },
      {
        id: 'tower_charlie',
        name: 'Tower Charlie',
        position: { x: 1700, y: 1600 },
        txPowerDbm: 33,
        height: 30,
        loadFactor: 0.1,
        isOnline: true,
      },
    ],
    obstacles: [
      {
        id: 'obs_ridge',
        name: 'Mountain Ridge',
        bounds: { xMin: 700, xMax: 900, yMin: 500, yMax: 1500 },
        attenuationDb: 22,
      },
      {
        id: 'obs_urban_core',
        name: 'Urban Highrise Zone',
        bounds: { xMin: 1200, xMax: 1500, yMin: 700, yMax: 1100 },
        attenuationDb: 18,
      },
    ],
    jammers: [
      {
        id: 'jam_zone_1',
        position: { x: 1100, y: 800 },
        radius: 250,
        strengthDbm: -55,
      },
    ],
  };
}
