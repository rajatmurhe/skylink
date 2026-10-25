import { UAVState, Position2D } from '../types/sim';

export interface UAVKinematicConfig {
  maxSpeedMs: number;       // 15 m/s
  maxAccelMs2: number;      // 3.0 m/s^2
  maxTurnRateRadS: number;  // 1.5 rad/s
  hoverPowerW: number;      // 150 W
  dragPowerCoeff: number;   // 0.4 W / (m/s)^2
  maxBatteryWh: number;     // 100 Wh
  safetyFactor: number;     // 1.25
}

export const DEFAULT_UAV_CONFIG: UAVKinematicConfig = {
  maxSpeedMs: 15.0,
  maxAccelMs2: 3.0,
  maxTurnRateRadS: 1.5,
  hoverPowerW: 150.0,
  dragPowerCoeff: 0.4,
  maxBatteryWh: 100.0,
  safetyFactor: 1.25,
};

export function createInitialUAVState(
  homePosition: Position2D,
  initialBatteryWh = 100
): UAVState {
  return {
    position: { ...homePosition },
    velocity: { x: 0, y: 0 },
    speed: 0,
    headingRad: 0,
    batteryWh: initialBatteryWh,
    maxBatteryWh: initialBatteryWh,
    returnReserveWh: 0,
    isHome: true,
    isGeofenced: false,
  };
}

export function calculatePowerDrawW(
  speed: number,
  config: UAVKinematicConfig = DEFAULT_UAV_CONFIG
): number {
  return config.hoverPowerW + config.dragPowerCoeff * Math.pow(speed, 2);
}

export function calculateReturnReserveWh(
  currentPos: Position2D,
  homePos: Position2D,
  config: UAVKinematicConfig = DEFAULT_UAV_CONFIG
): number {
  const dx = homePos.x - currentPos.x;
  const dy = homePos.y - currentPos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Time in hours to fly home at cruising speed (12 m/s)
  const cruiseSpeed = Math.min(12.0, config.maxSpeedMs);
  const flightTimeHours = dist / cruiseSpeed / 3600;
  const powerW = calculatePowerDrawW(cruiseSpeed, config);

  return powerW * flightTimeHours * config.safetyFactor;
}

export function updateUAVKinematics(
  state: UAVState,
  targetWaypointPos: Position2D,
  homePos: Position2D,
  dtSeconds: number,
  config: UAVKinematicConfig = DEFAULT_UAV_CONFIG
): UAVState {
  if (state.batteryWh <= 0) return { ...state, speed: 0, velocity: { x: 0, y: 0 } };
  const dx = targetWaypointPos.x - state.position.x;
  const dy = targetWaypointPos.y - state.position.y;
  const distToTarget = Math.sqrt(dx * dx + dy * dy);

  let targetHeading = state.headingRad;
  if (distToTarget > 0.5) {
    targetHeading = Math.atan2(dy, dx);
  }

  // Turn rate limiting
  let angleDiff = targetHeading - state.headingRad;
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

  const maxTurn = config.maxTurnRateRadS * dtSeconds;
  const clampedAngleDiff = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
  const newHeading = state.headingRad + clampedAngleDiff;

  // Speed calculation with smooth acceleration
  // Brake using stopping distance, and slow before sharp turns. The old
  // fixed 20 m slowdown let a 15 m/s vehicle orbit short A* segments.
  const brakingSpeed = Math.sqrt(2 * config.maxAccelMs2 * Math.max(0, distToTarget - 0.5));
  const headingAlignment = Math.max(0, Math.cos(angleDiff));
  const targetSpeed = Math.min(config.maxSpeedMs, brakingSpeed) * headingAlignment;

  const speedDiff = targetSpeed - state.speed;
  const maxAccel = config.maxAccelMs2 * dtSeconds;
  const newSpeed = state.speed + Math.max(-maxAccel, Math.min(maxAccel, speedDiff));

  // Velocity components
  const vx = Math.cos(newHeading) * newSpeed;
  const vy = Math.sin(newHeading) * newSpeed;

  // New position
  const newX = state.position.x + vx * dtSeconds;
  const newY = state.position.y + vy * dtSeconds;

  // Energy consumption
  const powerW = calculatePowerDrawW(newSpeed, config);
  const energyConsumedWh = (powerW * dtSeconds) / 3600;
  const newBatteryWh = Math.max(0, state.batteryWh - energyConsumedWh);

  // Return reserve Wh calculation
  const newPos = { x: newX, y: newY };
  const returnReserveWh = calculateReturnReserveWh(newPos, homePos, config);

  // Check home status
  const distToHome = Math.sqrt(
    Math.pow(newX - homePos.x, 2) + Math.pow(newY - homePos.y, 2)
  );

  return {
    ...state,
    position: newPos,
    velocity: { x: vx, y: vy },
    speed: newSpeed,
    headingRad: newHeading,
    batteryWh: newBatteryWh,
    returnReserveWh,
    isHome: distToHome < 15,
  };
}
