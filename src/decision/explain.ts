import { ActionType, CommState, UAVState, Waypoint, RiskAssessment } from '../types/sim';

export function generatePlainEnglishExplanation(
  action: ActionType,
  comm: CommState,
  uav: UAVState,
  waypoints: Waypoint[],
  risk: RiskAssessment
): string {
  const uncaptured = waypoints.filter((w) => !w.captured);
  const nextTarget = uncaptured[0];

  const qPercent = Math.round(comm.linkQuality * 100);
  const predQPercent = Math.round(comm.predictedLinkQuality * 100);
  const batteryPercent = Math.round((uav.batteryWh / uav.maxBatteryWh) * 100);

  switch (action) {
    case 'CONTINUE': {
      if (comm.linkState === 'GOOD') {
        return `Link quality is strong at ${qPercent} percent. UAV is following its route toward ${nextTarget?.name || 'next waypoint'}.`;
      }
      return `Link quality is ${qPercent} percent. Continuing current route under the current policy.`;
    }

    case 'REPLAN': {
      return `Signal predicted to drop to ${predQPercent} percent in 5 seconds. Communication aware A star is evaluating a route with penalties for low coverage.`;
    }

    case 'RECOVER_CONNECTIVITY': {
      return `Signal degraded to ${qPercent} percent near ${nextTarget?.name || 'target'}. Diverting toward the nearest online tower to seek better modeled coverage.`;
    }

    case 'HOLD': {
      return `Holding the current target position while the policy reassesses connectivity.`;
    }

    case 'RESUME': {
      return `Signal restored to ${qPercent} percent. Resuming flight path to capture remaining ${risk.missionCriticality * 100} percent mission value.`;
    }

    case 'SAFE_RETURN': {
      if (uav.batteryWh <= uav.returnReserveWh + 2) {
        return `Battery dropped to ${batteryPercent} percent, reaching safety return reserve. Executing safe return home.`;
      }
      return `Return-to-home is active because of a safety abort or mission completion.`;
    }

    default:
      return `Executing action ${action} with current link quality at ${qPercent} percent.`;
  }
}
