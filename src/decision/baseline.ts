import { ActionType, CommState, UAVState, Waypoint } from '../types/sim';

export class BaselineDecisionEngine {
  private poorLinkTicks = 0;
  private isAborted = false;

  public reset(): void {
    this.poorLinkTicks = 0;
    this.isAborted = false;
  }

  public decide(comm: CommState, uav: UAVState, waypoints: Waypoint[]): {
    action: ActionType;
    explanation: string;
  } {
    const uncaptured = waypoints.filter((w) => !w.captured);

    // Hard battery safety
    if (uav.batteryWh <= uav.returnReserveWh) {
      this.isAborted = true;
      return {
        action: 'SAFE_RETURN',
        explanation: 'Baseline: Battery reached return reserve threshold. Aborting mission to return home.',
      };
    }

    if (this.isAborted) {
      return {
        action: 'SAFE_RETURN',
        explanation: 'Baseline: Mission aborted previously. Continuing return home.',
      };
    }

    // Monitor link state
    if (comm.linkState === 'POOR' || comm.linkState === 'OUTAGE') {
      this.poorLinkTicks++;
    } else {
      this.poorLinkTicks = 0;
    }

    // Abort if poor/outage link persists for > 5 seconds (50 ticks)
    if (this.poorLinkTicks > 50) {
      this.isAborted = true;
      return {
        action: 'SAFE_RETURN',
        explanation: 'Baseline: Signal outage exceeded 5 seconds. Aborting mission and returning home on static route.',
      };
    }

    if (uncaptured.length === 0) {
      return {
        action: 'SAFE_RETURN',
        explanation: 'Baseline: All waypoints visited. Returning home.',
      };
    }

    return {
      action: 'CONTINUE',
      explanation: 'Baseline: Following static pre-planned route.',
    };
  }
}
