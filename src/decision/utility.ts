import { ActionType, CommState, UAVState, Waypoint, WorldState } from '../types/sim';

export interface UtilityWeights {
  wComm: number;
  wMission: number;
  wEnergy: number;
  wRisk: number;
}

export type PresetWeightType = 'mission_first' | 'balanced' | 'safety_first';

export const UTILITY_PRESETS: Record<PresetWeightType, UtilityWeights> = {
  mission_first: { wMission: 0.50, wComm: 0.20, wEnergy: 0.10, wRisk: 0.20 },
  balanced: { wMission: 0.35, wComm: 0.35, wEnergy: 0.15, wRisk: 0.15 },
  safety_first: { wMission: 0.15, wComm: 0.30, wEnergy: 0.25, wRisk: 0.30 },
};

export function evaluateActionScores(
  comm: CommState,
  uav: UAVState,
  waypoints: Waypoint[],
  _world: WorldState,
  weights: UtilityWeights = UTILITY_PRESETS.balanced,
  currentAction: ActionType = 'CONTINUE'
): { scores: Record<ActionType, number>; bestAction: ActionType } {
  const uncaptured = waypoints.filter((w) => !w.captured);
  const remainingValue = uncaptured.reduce((a, b) => a + b.value, 0);

  const totalValue = waypoints.reduce((a,b) => a + b.value, 0) || 1;

  // Hard Safety Constraint: Battery below return reserve
  if (uav.batteryWh <= uav.returnReserveWh) {
    return {
      scores: {
        CONTINUE: 0,
        REPLAN: 0,
        RECOVER_CONNECTIVITY: 0,
        HOLD: 0,
        RESUME: 0,
        SAFE_RETURN: 1.0,
      },
      bestAction: 'SAFE_RETURN',
    };
  }

  // 1. CONTINUE
  const scoreContinue =
    weights.wComm * comm.predictedLinkQuality +
    weights.wMission * (remainingValue / totalValue) -
    weights.wRisk * (1 - comm.predictedLinkQuality);

  // 2. REPLAN (Avoid low signal cells)
  const scoreReplan =
    weights.wComm * Math.min(1.0, comm.predictedLinkQuality + 0.3) +
    weights.wMission * (remainingValue / totalValue) * 0.9 -
    weights.wEnergy * 0.1 -
    weights.wRisk * 0.1;

  // 3. RECOVER CONNECTIVITY (Seek high RSSI zone)
  const scoreRecover =
    weights.wComm * 0.95 +
    weights.wMission * (remainingValue / totalValue) * 0.5 -
    weights.wEnergy * 0.2 -
    weights.wRisk * 0.05;

  // 4. HOLD (Loiter in place for transient recovery)
  const scoreHold =
    weights.wComm * comm.linkQualityEma -
    weights.wEnergy * 0.15 -
    weights.wMission * 0.1;

  // 5. RESUME (Rejoin original route)
  const scoreResume =
    comm.linkQuality > 0.5
      ? weights.wComm * comm.linkQuality + weights.wMission * (remainingValue / totalValue)
      : 0;

  // 6. SAFE RETURN (Abort to home)
  const scoreSafeReturn =
    uav.batteryWh < uav.returnReserveWh + 5
      ? 0.95
      : weights.wRisk * 0.8 - weights.wMission * (remainingValue / totalValue);

  const rawScores: Record<ActionType, number> = {
    CONTINUE: Math.max(0, scoreContinue),
    REPLAN: Math.max(0, scoreReplan),
    RECOVER_CONNECTIVITY: comm.linkQuality < 0.45 ? Math.max(0, scoreRecover) : 0,
    HOLD: Math.max(0, scoreHold),
    RESUME: ['REPLAN', 'HOLD', 'RECOVER_CONNECTIVITY'].includes(currentAction) ? Math.max(0, scoreResume) : 0,
    SAFE_RETURN: Math.max(0, scoreSafeReturn),
  };

  // Add hysteresis bias (+0.1) to currently active action to prevent flip-flopping
  rawScores[currentAction] += 0.1;

  let bestAction: ActionType = 'CONTINUE';
  let maxScore = -1;

  (Object.keys(rawScores) as ActionType[]).forEach((a) => {
    if (rawScores[a] > maxScore) {
      maxScore = rawScores[a];
      bestAction = a;
    }
  });

  return { scores: rawScores, bestAction };
}
