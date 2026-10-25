import { LinkState, WorldState, Position2D } from '../types/sim';
import { computeCommState } from './comm_model';

export class CommMonitor {
  private historyQ: number[] = [];
  private emaQ = 1.0;
  private alpha = 0.3; // EMA weight
  private heartbeatMissedTicks = 0;

  public reset(initialQ = 1.0): void {
    this.historyQ = [];
    this.emaQ = initialQ;
    this.heartbeatMissedTicks = 0;
  }

  public update(currentQ: number): {
    emaQ: number;
    slope: number;
    predictedQ: number;
    linkState: LinkState;
    heartbeatMissedTicks: number;
  } {
    // 1. Exponential Moving Average smoothing
    this.emaQ = this.alpha * currentQ + (1 - this.alpha) * this.emaQ;
    this.historyQ.push(this.emaQ);

    // Keep last 50 ticks (5 seconds) of history
    if (this.historyQ.length > 50) {
      this.historyQ.shift();
    }

    // 2. Slope estimation over 2 second window (20 ticks)
    let slope = 0;
    const windowTicks = 20;
    if (this.historyQ.length > windowTicks) {
      const qPast = this.historyQ[this.historyQ.length - windowTicks - 1];
      slope = (this.emaQ - qPast) / 2.0; // Per second
    }

    // 3. Predict Q 5 seconds ahead
    const predictedQ = Math.max(0, Math.min(1, this.emaQ + slope * 5.0));

    // 4. Heartbeat tracking
    if (currentQ < 0.1) {
      this.heartbeatMissedTicks++;
    } else {
      this.heartbeatMissedTicks = 0;
    }

    // 5. Link state classification
    let linkState: LinkState = 'GOOD';

    if (this.emaQ < 0.2 || this.heartbeatMissedTicks >= 3) {
      linkState = 'OUTAGE';
    } else if (this.emaQ < 0.45) {
      linkState = 'POOR';
    } else if (this.emaQ < 0.7 || predictedQ < 0.45) {
      linkState = 'DEGRADING';
    } else {
      linkState = 'GOOD';
    }

    return {
      emaQ: parseFloat(this.emaQ.toFixed(3)),
      slope: parseFloat(slope.toFixed(3)),
      predictedQ: parseFloat(predictedQ.toFixed(3)),
      linkState,
      heartbeatMissedTicks: this.heartbeatMissedTicks,
    };
  }
}

/**
 * Generates a 2D coverage heatmap grid of link quality Q values.
 */
export function generateCoverageGrid(
  world: WorldState,
  cols = 40,
  rows = 40,
  shadowNoiseMap?: (x: number, y: number) => number
): number[][] {
  const grid: number[][] = [];
  const cellWidth = world.mapSize.width / cols;
  const cellHeight = world.mapSize.height / rows;

  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    const y = (r + 0.5) * cellHeight;

    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) * cellWidth;
      const pos: Position2D = { x, y };

      const { comm } = computeCommState(pos, world, null, shadowNoiseMap);
      row.push(comm.linkQuality);
    }
    grid.push(row);
  }

  return grid;
}
