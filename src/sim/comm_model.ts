import { Position2D, Tower, Obstacle, Jammer, WorldState, CommState } from '../types/sim';

export interface CommModelConfig {
  pl0Db: number;            // Reference path loss at 1m (38.5 dB)
  pathLossExponent: number; // n = 2.4 open/suburban
  shadowStdDevDb: number;   // 3.0 dB
  thermalNoiseDbm: number;  // -95 dBm
  handoverHysteresisDb: number; // 3.0 dB
}

export const DEFAULT_COMM_CONFIG: CommModelConfig = {
  pl0Db: 38.5,
  pathLossExponent: 2.4,
  shadowStdDevDb: 3.0,
  thermalNoiseDbm: -95.0,
  handoverHysteresisDb: 3.0,
};

/**
 * Checks if line segment (p1 -> p2) intersects axis-aligned rectangle bounds.
 */
export function lineIntersectsBox(
  p1: Position2D,
  p2: Position2D,
  box: { xMin: number; xMax: number; yMin: number; yMax: number }
): boolean {
  // Simple Liang-Barsky line clipping algorithm for AABB
  let t0 = 0;
  let t1 = 1;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  const checks = [
    [-dx, p1.x - box.xMin],
    [dx, box.xMax - p1.x],
    [-dy, p1.y - box.yMin],
    [dy, box.yMax - p1.y],
  ];

  for (const [p, q] of checks) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const r = q / p;
      if (p < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return true;
}

/**
 * Calculates received signal strength RSSI from a tower to UAV.
 */
export function calculateTowerRSSI(
  tower: Tower,
  uavPos: Position2D,
  obstacles: Obstacle[],
  shadowNoiseDb = 0,
  config: CommModelConfig = DEFAULT_COMM_CONFIG
): number {
  if (!tower.isOnline) return -150; // Offline tower

  const dx = uavPos.x - tower.position.x;
  const dy = uavPos.y - tower.position.y;
  const dist2D = Math.sqrt(dx * dx + dy * dy);
  const dist3D = Math.max(1, Math.sqrt(dist2D * dist2D + tower.height * tower.height));

  // Path loss
  const pathLoss = config.pl0Db + 10 * config.pathLossExponent * Math.log10(dist3D);

  // Obstacle loss
  let obstacleLoss = 0;
  obstacles.forEach((obs) => {
    if (lineIntersectsBox(tower.position, uavPos, obs.bounds)) {
      obstacleLoss += obs.attenuationDb;
    }
  });

  return tower.txPowerDbm - pathLoss - obstacleLoss - shadowNoiseDb;
}

/**
 * Calculates total interference noise in dBm from jammers.
 */
export function calculateInterferenceNoiseDbm(
  uavPos: Position2D,
  jammers: Jammer[],
  thermalNoiseDbm = -95
): number {
  let thermalmW = Math.pow(10, thermalNoiseDbm / 10);
  let jammerSummW = 0;

  jammers.forEach((j) => {
    const dx = uavPos.x - j.position.x;
    const dy = uavPos.y - j.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= j.radius * 2) {
      // Interference falloff with distance
      const jammerDbm = j.strengthDbm - 20 * Math.log10(Math.max(1, dist / 10));
      jammerSummW += Math.pow(10, jammerDbm / 10);
    }
  });

  return 10 * Math.log10(thermalmW + jammerSummW);
}

/**
 * Calculates SINR to Link Quality Q mapping in [0, 1].
 */
export function sinrToLinkQuality(sinrDb: number): number {
  // Map 5 dB (outage) to 25 dB (excellent)
  const minSinr = 5.0;
  const maxSinr = 25.0;
  const q = (sinrDb - minSinr) / (maxSinr - minSinr);
  return Math.max(0, Math.min(1, q));
}

/**
 * Full communication state calculation at given UAV position.
 */
export function computeCommState(
  uavPos: Position2D,
  world: WorldState,
  prevServingTowerId: string | null,
  shadowNoiseMap?: (x: number, y: number) => number,
  config: CommModelConfig = DEFAULT_COMM_CONFIG
): { comm: Omit<CommState, 'linkQualityEma' | 'predictedLinkQuality' | 'linkState' | 'heartbeatMissedTicks'>; servingTowerId: string | null } {
  const shadowDb = shadowNoiseMap
    ? shadowNoiseMap(uavPos.x / world.mapSize.width, uavPos.y / world.mapSize.height) * config.shadowStdDevDb
    : 0;

  // Calculate RSSI for all online towers
  let bestTowerId: string | null = null;
  let bestTowerRSSI = -150;

  let currentServingRSSI = -150;

  world.towers.forEach((tower) => {
    if (!tower.isOnline) return;
    const rssi = calculateTowerRSSI(tower, uavPos, world.obstacles, shadowDb, config);
    if (tower.id === prevServingTowerId) {
      currentServingRSSI = rssi;
    }
    if (rssi > bestTowerRSSI) {
      bestTowerRSSI = rssi;
      bestTowerId = tower.id;
    }
  });

  // Apply 3 dB handover hysteresis
  let servingTowerId = prevServingTowerId;
  if (!world.towers.some(t => t.id === servingTowerId && t.isOnline) || bestTowerRSSI > currentServingRSSI + config.handoverHysteresisDb) {
    servingTowerId = bestTowerId;
  }

  const servingTower = world.towers.find((t) => t.id === servingTowerId);
  const rssiDbm = servingTower
    ? calculateTowerRSSI(servingTower, uavPos, world.obstacles, shadowDb, config)
    : -150;

  const totalNoiseDbm = calculateInterferenceNoiseDbm(uavPos, world.jammers, config.thermalNoiseDbm);
  const sinrDb = rssiDbm - totalNoiseDbm;
  const linkQuality = sinrToLinkQuality(sinrDb);

  // Packet loss logistic curve centered near Q = 0.35
  const packetLossProb = Math.max(0, Math.min(1, 1 / (1 + Math.exp(15 * (linkQuality - 0.35)))));

  // Latency grows with (1 - Q)^2
  const baseLatencyMs = 15;
  const latencyMs = Math.round(baseLatencyMs + 150 * Math.pow(1 - linkQuality, 2));

  // Throughput scales with Q and tower load
  const loadFactor = servingTower ? servingTower.loadFactor : 1.0;
  const throughputMbps = parseFloat((40.0 * linkQuality * (1 - loadFactor * 0.8)).toFixed(1));

  return {
    comm: {
      rssiDbm: parseFloat(rssiDbm.toFixed(1)),
      sinrDb: parseFloat(sinrDb.toFixed(1)),
      linkQuality: parseFloat(linkQuality.toFixed(3)),
      servingTowerId,
      packetLossProb: parseFloat(packetLossProb.toFixed(3)),
      latencyMs,
      throughputMbps,
    },
    servingTowerId,
  };
}
