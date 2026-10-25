import { WorldState, Waypoint, TickRecord, Position2D } from '../../types/sim';

export interface CanvasRenderOptions {
  isHeatmapVisible: boolean;
  isGhostVisible: boolean;
  coverageGrid?: number[][];
}

export function drawTerrainGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  world: WorldState
): void {
  const scaleX = width / world.mapSize.width;
  const scaleY = height / world.mapSize.height;

  // Background navy grid
  ctx.fillStyle = '#0c151e';
  ctx.fillRect(0, 0, width, height);

  // Subtle grid lines (100m grid)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;

  for (let x = 0; x <= world.mapSize.width; x += 100) {
    const cx = x * scaleX;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.stroke();
  }

  for (let y = 0; y <= world.mapSize.height; y += 100) {
    const cy = y * scaleY;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.stroke();
  }

  // Draw Home Base
  const homeX = world.homePosition.x * scaleX;
  const homeY = world.homePosition.y * scaleY;

  ctx.strokeStyle = '#a5edba';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(homeX, homeY, 16, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = 'rgba(165, 237, 186, 0.2)';
  ctx.fill();

  ctx.fillStyle = '#a5edba';
  ctx.font = 'bold 10px "JetBrains Mono"';
  ctx.textAlign = 'center';
  ctx.fillText('HOME H', homeX, homeY + 4);
}

export function drawHeatmapGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  coverageGrid: number[][]
): void {
  const rows = coverageGrid.length;
  if (rows === 0) return;
  const cols = coverageGrid[0].length;

  const cellW = width / cols;
  const cellH = height / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const q = coverageGrid[r][c];

      // Color mapping from Q
      let color = `rgba(244, 63, 94, ${0.35 * (1 - q)})`; // Red outage
      if (q >= 0.7) {
        color = `rgba(45, 212, 191, ${0.2 * q})`; // Teal good
      } else if (q >= 0.45) {
        color = `rgba(250, 204, 21, ${0.25 * q})`; // Yellow degrading
      } else if (q >= 0.2) {
        color = `rgba(251, 146, 60, ${0.3 * (1 - q)})`; // Orange poor
      }

      ctx.fillStyle = color;
      ctx.fillRect(c * cellW, r * cellH, cellW + 0.5, cellH + 0.5);
    }
  }
}

export function drawObstaclesAndJammers(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  world: WorldState
): void {
  const scaleX = width / world.mapSize.width;
  const scaleY = height / world.mapSize.height;

  // Draw Obstacles (buildings/hills)
  world.obstacles.forEach((obs) => {
    const x = obs.bounds.xMin * scaleX;
    const y = obs.bounds.yMin * scaleY;
    const w = (obs.bounds.xMax - obs.bounds.xMin) * scaleX;
    const h = (obs.bounds.yMax - obs.bounds.yMin) * scaleY;

    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px "Inter"';
    ctx.textAlign = 'center';
    ctx.fillText(obs.name, x + w / 2, y + h / 2 + 3);
  });

  // Draw Jammers
  world.jammers.forEach((j) => {
    const cx = j.position.x * scaleX;
    const cy = j.position.y * scaleY;
    const r = j.radius * scaleX;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, 'rgba(244, 63, 94, 0.4)');
    grad.addColorStop(1, 'rgba(244, 63, 94, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fill();

    ctx.strokeStyle = 'rgba(244, 63, 94, 0.5)';
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  });
}

export function drawTowers(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  world: WorldState,
  animTimeMs: number
): void {
  const scaleX = width / world.mapSize.width;
  const scaleY = height / world.mapSize.height;

  world.towers.forEach((tower) => {
    const cx = tower.position.x * scaleX;
    const cy = tower.position.y * scaleY;

    if (tower.isOnline) {
      // Pulse animation range ring
      const pulseR = 30 + (animTimeMs % 2000) / 50;
      ctx.strokeStyle = 'rgba(165, 237, 186, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseR, 0, 2 * Math.PI);
      ctx.stroke();

      // Tower icon node
      ctx.fillStyle = '#a5edba';
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      // Offline tower node
      ctx.fillStyle = '#F43F5E';
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.fillStyle = tower.isOnline ? '#E2E8F0' : '#F43F5E';
    ctx.font = 'bold 11px "Space Grotesk"';
    ctx.textAlign = 'center';
    ctx.fillText(tower.name, cx, cy - 12);
  });
}

export function drawWaypoints(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  world: WorldState,
  waypoints: Waypoint[]
): void {
  const scaleX = width / world.mapSize.width;
  const scaleY = height / world.mapSize.height;

  waypoints.forEach((wp) => {
    const cx = wp.position.x * scaleX;
    const cy = wp.position.y * scaleY;

    // Waypoint circle
    ctx.fillStyle = wp.captured ? 'rgba(45, 212, 191, 0.3)' : 'rgba(139, 92, 246, 0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, 2 * Math.PI);
    ctx.fill();

    ctx.strokeStyle = wp.captured ? '#2DD4BF' : '#8B5CF6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Value badge inside
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(`${wp.value}v`, cx, cy + 3.5);

    // Label above
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '10px "Inter"';
    ctx.fillText(wp.name, cx, cy - 18);
  });
}

export function drawFlightTrail(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  world: WorldState,
  historyRecords: TickRecord[]
): void {
  if (historyRecords.length < 2) return;
  const scaleX = width / world.mapSize.width;
  const scaleY = height / world.mapSize.height;

  for (let i = 1; i < historyRecords.length; i++) {
    const p1 = historyRecords[i - 1].uav.position;
    const p2 = historyRecords[i].uav.position;
    const comm = historyRecords[i].comm;

    // Color by Q state
    let strokeColor = '#2DD4BF'; // Good
    if (comm.linkState === 'DEGRADING') strokeColor = '#FACC15';
    else if (comm.linkState === 'POOR') strokeColor = '#FB923C';
    else if (comm.linkState === 'OUTAGE') strokeColor = '#F43F5E';

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p1.x * scaleX, p1.y * scaleY);
    ctx.lineTo(p2.x * scaleX, p2.y * scaleY);
    ctx.stroke();
  }
}

export function drawUAV(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  world: WorldState,
  uavPos: Position2D,
  headingRad: number,
  linkState: string
): void {
  const scaleX = width / world.mapSize.width;
  const scaleY = height / world.mapSize.height;

  const cx = uavPos.x * scaleX;
  const cy = uavPos.y * scaleY;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(headingRad);

  // Soft glow ring on drone
  const glowColor =
    linkState === 'OUTAGE'
      ? 'rgba(244, 63, 94, 0.6)'
      : linkState === 'DEGRADING'
      ? 'rgba(250, 204, 21, 0.6)'
      : 'rgba(165, 237, 186, 0.6)';

  ctx.fillStyle = glowColor;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, 2 * Math.PI);
  ctx.fill();

  // UAV Body triangle
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-8, -7);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-8, 7);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
