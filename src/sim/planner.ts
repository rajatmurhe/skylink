import { Position2D, WorldState, Waypoint } from '../types/sim';
import { computeCommState } from './comm_model';

export interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

/**
 * Grid based A* path planner.
 */
export function planPathAStar(
  startPos: Position2D,
  goalPos: Position2D,
  world: WorldState,
  commAware = true,
  lambdaCommCost = 150.0,
  cellSizeM = 50
): Position2D[] {
  const cols = Math.floor(world.mapSize.width / cellSizeM);
  const rows = Math.floor(world.mapSize.height / cellSizeM);

  const startCol = Math.max(0, Math.min(cols - 1, Math.floor(startPos.x / cellSizeM)));
  const startRow = Math.max(0, Math.min(rows - 1, Math.floor(startPos.y / cellSizeM)));
  const goalCol = Math.max(0, Math.min(cols - 1, Math.floor(goalPos.x / cellSizeM)));
  const goalRow = Math.max(0, Math.min(rows - 1, Math.floor(goalPos.y / cellSizeM)));

  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();

  const startNode: PathNode = {
    x: startCol,
    y: startRow,
    g: 0,
    h: Math.hypot(startCol - goalCol, startRow - goalRow) * cellSizeM,
    f: Math.hypot(startCol - goalCol, startRow - goalRow) * cellSizeM,
    parent: null,
  };

  openSet.push(startNode);

  const getKey = (c: number, r: number) => `${c}_${r}`;

  let finalNode: PathNode | null = null;

  while (openSet.length > 0) {
    // Sort by f score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    if (current.x === goalCol && current.y === goalRow) {
      finalNode = current;
      break;
    }

    const currentKey = getKey(current.x, current.y);
    closedSet.add(currentKey);

    // 8-neighbor movement
    const neighbors = [
      { dx: 1, dy: 0, dist: 1 },
      { dx: -1, dy: 0, dist: 1 },
      { dx: 0, dy: 1, dist: 1 },
      { dx: 0, dy: -1, dist: 1 },
      { dx: 1, dy: 1, dist: Math.SQRT2 },
      { dx: -1, dy: 1, dist: Math.SQRT2 },
      { dx: 1, dy: -1, dist: Math.SQRT2 },
      { dx: -1, dy: -1, dist: Math.SQRT2 },
    ];

    for (const n of neighbors) {
      const nx = current.x + n.dx;
      const ny = current.y + n.dy;

      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      const neighborKey = getKey(nx, ny);
      if (closedSet.has(neighborKey)) continue;

      const worldX = (nx + 0.5) * cellSizeM;
      const worldY = (ny + 0.5) * cellSizeM;
      const pos: Position2D = { x: worldX, y: worldY };

      const fence = world.geofence;
      if (worldX < fence.xMin || worldX > fence.xMax || worldY < fence.yMin || worldY > fence.yMax) continue;

      // Base move distance cost
      let moveCost = n.dist * cellSizeM;

      // Check obstacle intersection
      let obstaclePenalty = 0;
      world.obstacles.forEach((obs) => {
        if (
          worldX >= obs.bounds.xMin &&
          worldX <= obs.bounds.xMax &&
          worldY >= obs.bounds.yMin &&
          worldY <= obs.bounds.yMax
        ) {
          obstaclePenalty += 1000; // Heavy penalty for inside obstacle
        }
      });

      // Communication aware cost penalty
      let commPenalty = 0;
      if (commAware) {
        const commRes = computeCommState(pos, world, null);
        commPenalty = lambdaCommCost * (1 - commRes.comm.linkQuality);
      }

      const tentativeG = current.g + moveCost + obstaclePenalty + commPenalty;

      const existingNode = openSet.find((node) => node.x === nx && node.y === ny);
      if (!existingNode) {
        const h = Math.hypot(nx - goalCol, ny - goalRow) * cellSizeM;
        const newNode: PathNode = {
          x: nx,
          y: ny,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: current,
        };
        openSet.push(newNode);
      } else if (tentativeG < existingNode.g) {
        existingNode.g = tentativeG;
        existingNode.f = tentativeG + existingNode.h;
        existingNode.parent = current;
      }
    }
  }

  // Reconstruct path
  const path: Position2D[] = [];
  let curr = finalNode;
  while (curr) {
    path.unshift({
      x: (curr.x + 0.5) * cellSizeM,
      y: (curr.y + 0.5) * cellSizeM,
    });
    curr = curr.parent;
  }

  if (path.length === 0) {
    // Fallback direct line if A* blocked
    return [startPos, goalPos];
  }

  return path;
}

export function planStaticMissionPath(
  homePos: Position2D,
  waypoints: Waypoint[],
  world: WorldState
): Position2D[] {
  const points = [homePos, ...waypoints.map((w) => w.position), homePos];
  const fullPath: Position2D[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const segment = planPathAStar(points[i], points[i + 1], world, false);
    if (i > 0) segment.shift(); // Remove duplicate start node
    fullPath.push(...segment);
  }

  return fullPath;
}
