import { ActionType, CommState, UAVState, Waypoint } from '../types/sim';

export interface DiscretizedState {
  stateIndex: number;
  stateKey: string;
  linkBucket: number;      // 0 to 4
  trendBucket: number;     // 0 to 2
  batteryBucket: number;   // 0 to 3
  missionBucket: number;   // 0 to 3
  distHomeBucket: number;  // 0 to 2
  recoveryFlag: number;    // 0 or 1
}

export function discretizeState(
  comm: CommState,
  uav: UAVState,
  waypoints: Waypoint[],
  isRecoveryPhase = false,
  homePosition = { x: 200, y: 200 }
): DiscretizedState {
  // 1. Link quality Q bucket (5)
  const q = comm.linkQuality;
  let linkBucket = 0;
  if (q >= 0.9) linkBucket = 4;
  else if (q >= 0.7) linkBucket = 3;
  else if (q >= 0.45) linkBucket = 2;
  else if (q >= 0.2) linkBucket = 1;
  else linkBucket = 0;

  // 2. Link trend slope bucket (3)
  const slope = comm.predictedLinkQuality - comm.linkQuality;
  let trendBucket = 1; // Stable
  if (slope < -0.1) trendBucket = 0; // Falling
  else if (slope > 0.1) trendBucket = 2; // Rising

  // 3. Battery margin over reserve Wh (4)
  const margin = uav.batteryWh - uav.returnReserveWh;
  let batteryBucket = 0;
  if (margin >= 30) batteryBucket = 3;
  else if (margin >= 15) batteryBucket = 2;
  else if (margin >= 5) batteryBucket = 1;
  else batteryBucket = 0;

  // 4. Remaining mission ratio (4)
  const totalVal = waypoints.reduce((a, b) => a + b.value, 0);
  const remVal = waypoints.filter((w) => !w.captured).reduce((a, b) => a + b.value, 0);
  const remRatio = totalVal > 0 ? remVal / totalVal : 0;
  let missionBucket = 0;
  if (remRatio > 0.66) missionBucket = 3;
  else if (remRatio > 0.33) missionBucket = 2;
  else if (remRatio > 0) missionBucket = 1;
  else missionBucket = 0;

  // 5. Distance to home bucket (3)
  let distHomeBucket = 0;
  if (Math.hypot(uav.position.x - homePosition.x, uav.position.y - homePosition.y) > 1200) distHomeBucket = 2;
  else if (Math.hypot(uav.position.x - homePosition.x, uav.position.y - homePosition.y) > 500) distHomeBucket = 1;
  else distHomeBucket = 0;

  // 6. Recovery phase flag (2)
  const recoveryFlag = isRecoveryPhase ? 1 : 0;

  // Compute unique 1D state index in range [0, 1439]
  const stateIndex =
    linkBucket +
    5 *
      (trendBucket +
        3 *
          (batteryBucket +
            4 * (missionBucket + 4 * (distHomeBucket + 3 * recoveryFlag))));

  const stateKey = `s_${linkBucket}_${trendBucket}_${batteryBucket}_${missionBucket}_${distHomeBucket}_${recoveryFlag}`;

  return {
    stateIndex,
    stateKey,
    linkBucket,
    trendBucket,
    batteryBucket,
    missionBucket,
    distHomeBucket,
    recoveryFlag,
  };
}

export function calculateStepReward(
  _action: ActionType,
  comm: CommState,
  uav: UAVState,
  newlyCapturedValue: number,
  isMissionComplete: boolean
): number {
  let reward = 0;

  // Positive reward for captured value
  reward += newlyCapturedValue * 15.0;

  // Small positive term for link quality
  reward += comm.linkQuality * 2.0;

  // Penalty for energy consumption
  reward -= 0.1;

  // Heavy penalty for outage
  if (comm.linkState === 'OUTAGE') {
    reward -= 50.0;
  }

  // Large penalty for battery depletion
  if (uav.batteryWh <= 0) {
    reward -= 500.0;
  }

  // Completion bonus
  if (isMissionComplete) {
    reward += 150.0;
  }

  return reward;
}
