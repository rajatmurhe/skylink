import { Waypoint, Position2D } from '../types/sim';

export function createSampleWaypoints(): Waypoint[] {
  return [
    {
      id: 'wp_1',
      name: 'Search Zone Alpha',
      position: { x: 500, y: 600 },
      value: 5,
      captured: false,
    },
    {
      id: 'wp_2',
      name: 'Disaster Recon Beta',
      position: { x: 1100, y: 900 },
      value: 8,
      needsUplink: true, // Requires Q >= 0.5 upon arrival
      captured: false,
    },
    {
      id: 'wp_3',
      name: 'Survivor Video Stream Gamma',
      position: { x: 1600, y: 1400 },
      value: 10,
      needsUplink: true,
      captured: false,
    },
    {
      id: 'wp_4',
      name: 'Relief Drop Delta',
      position: { x: 1400, y: 1700 },
      value: 7,
      captured: false,
    },
  ];
}

export function evaluateWaypointCapture(
  waypoints: Waypoint[],
  uavPos: Position2D,
  currentQ: number,
  currentTick: number,
  captureRadiusM = 25
): { waypoints: Waypoint[]; capturedCount: number; newlyCapturedValue: number } {
  let newlyCapturedValue = 0;
  let capturedCount = 0;

  const updatedWaypoints = waypoints.map((wp) => {
    if (wp.captured) {
      capturedCount++;
      return wp;
    }

    if (wp.deadlineSeconds !== undefined && currentTick * 0.1 > wp.deadlineSeconds) return wp;
    const dist = Math.sqrt(
      Math.pow(wp.position.x - uavPos.x, 2) + Math.pow(wp.position.y - uavPos.y, 2)
    );

    if (dist <= captureRadiusM) {
      // Check needsUplink constraint if present
      if (wp.needsUplink && currentQ < 0.5) {
        // Uplink failed upon arrival, cannot capture yet
        return wp;
      }

      newlyCapturedValue += wp.value;
      capturedCount++;
      return {
        ...wp,
        captured: true,
        capturedAtTick: currentTick,
      };
    }

    return wp;
  });

  return {
    waypoints: updatedWaypoints,
    capturedCount,
    newlyCapturedValue,
  };
}

export function calculateMissionProgress(waypoints: Waypoint[]): {
  capturedValue: number;
  totalValue: number;
  progressRatio: number;
  remainingValue: number;
} {
  let capturedValue = 0;
  let totalValue = 0;

  waypoints.forEach((wp) => {
    totalValue += wp.value;
    if (wp.captured) {
      capturedValue += wp.value;
    }
  });

  const progressRatio = totalValue > 0 ? capturedValue / totalValue : 1.0;
  const remainingValue = totalValue - capturedValue;

  return {
    capturedValue,
    totalValue,
    progressRatio,
    remainingValue,
  };
}
