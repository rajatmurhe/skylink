export interface Position2D {
  x: number;
  y: number;
}

export interface Tower {
  id: string;
  name: string;
  position: Position2D;
  txPowerDbm: number; // e.g. 30 dBm
  height: number;    // e.g. 25 m
  loadFactor: number; // 0 to 1
  isOnline: boolean;
}

export interface Obstacle {
  id: string;
  name: string;
  bounds: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  };
  attenuationDb: number; // Signal attenuation e.g. 15 dB
}

export interface Jammer {
  id: string;
  position: Position2D;
  radius: number;       // Radius of effect in metres
  strengthDbm: number;  // Interference strength at center e.g. -60 dBm
}

export interface Waypoint {
  id: string;
  name: string;
  position: Position2D;
  value: number;            // 1 to 10
  deadlineSeconds?: number;
  needsUplink?: boolean;    // Requires Q >= 0.5 upon arrival
  captured: boolean;
  capturedAtTick?: number;
  deferredReason?: string;
}

export interface UAVState {
  position: Position2D;
  velocity: Position2D;
  speed: number;            // m/s, max 15
  headingRad: number;       // Radians
  batteryWh: number;        // Current battery in Wh
  maxBatteryWh: number;     // Total battery e.g. 100 Wh
  returnReserveWh: number;  // Energy needed to fly home times 1.25
  isHome: boolean;
  isGeofenced: boolean;
}

export interface WorldState {
  mapSize: { width: number; height: number }; // 2000 x 2000 m
  homePosition: Position2D;
  geofence: { xMin: number; xMax: number; yMin: number; yMax: number };
  towers: Tower[];
  obstacles: Obstacle[];
  jammers: Jammer[];
}

export type LinkState = 'GOOD' | 'DEGRADING' | 'POOR' | 'OUTAGE';

export interface CommState {
  rssiDbm: number;
  sinrDb: number;
  linkQuality: number;      // Q in [0, 1]
  linkQualityEma: number;   // Smoothed Q
  predictedLinkQuality: number; // Q predicted 5 seconds ahead
  linkState: LinkState;
  servingTowerId: string | null;
  packetLossProb: number;
  latencyMs: number;
  throughputMbps: number;
  heartbeatMissedTicks: number;
}

export type ActionType =
  | 'CONTINUE'
  | 'REPLAN'
  | 'RECOVER_CONNECTIVITY'
  | 'HOLD'
  | 'RESUME'
  | 'SAFE_RETURN';

export interface RiskAssessment {
  riskScore: number;            // 0 to 1
  predictedOutageSeconds: number;
  missionCriticality: number;   // Remaining value / Total value
  batteryMarginWh: number;      // Battery - Return reserve
  distanceToHomeM: number;
}

export interface DecisionRecord {
  tick: number;
  action: ActionType;
  actionScores: Record<ActionType, number>;
  explanation: string;
  dwellTicksRemaining: number;
}

export interface TickRecord {
  /** Immutable environment at this tick, retained for faithful replay. */
  world?: WorldState;
  tick: number;
  timeSeconds: number;
  uav: UAVState;
  waypoints: Waypoint[];
  comm: CommState;
  risk: RiskAssessment;
  decision: DecisionRecord;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  world: WorldState;
  waypoints: Waypoint[];
  initialBatteryWh: number;
}
