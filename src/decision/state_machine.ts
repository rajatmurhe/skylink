import { ActionType, CommState, UAVState, Waypoint, WorldState } from '../types/sim';
import { evaluateActionScores, UtilityWeights, UTILITY_PRESETS } from './utility';

export class DecisionStateMachine {
  private currentAction: ActionType = 'CONTINUE';
  private dwellTicksRemaining = 0;
  private minDwellTicks = 30; // 3 seconds minimum dwell on recovery actions

  public reset(): void {
    this.currentAction = 'CONTINUE';
    this.dwellTicksRemaining = 0;
  }

  public stepDecision(
    comm: CommState,
    uav: UAVState,
    waypoints: Waypoint[],
    world: WorldState,
    weights: UtilityWeights = UTILITY_PRESETS.balanced
  ): {
    action: ActionType;
    actionScores: Record<ActionType, number>;
    explanation: string;
    dwellTicksRemaining: number;
  } {
    // Hard Safety Shield overrides dwell timers
    if (uav.batteryWh <= uav.returnReserveWh) {
      this.currentAction = 'SAFE_RETURN';
      this.dwellTicksRemaining = 0;
      return {
        action: 'SAFE_RETURN',
        actionScores: {
          CONTINUE: 0,
          REPLAN: 0,
          RECOVER_CONNECTIVITY: 0,
          HOLD: 0,
          RESUME: 0,
          SAFE_RETURN: 1.0,
        },
        explanation: 'Hard Safety Shield: Battery reached return reserve threshold. Aborting to return home.',
        dwellTicksRemaining: 0,
      };
    }

    const { scores, bestAction } = evaluateActionScores(
      comm,
      uav,
      waypoints,
      world,
      weights,
      this.currentAction
    );

    // If active dwell timer is running, hold current action
    if (this.dwellTicksRemaining > 0) {
      this.dwellTicksRemaining--;
      return {
        action: this.currentAction,
        actionScores: scores,
        explanation: `Executing ${this.currentAction} with action dwell timer active (${(this.dwellTicksRemaining * 0.1).toFixed(1)}s remaining).`,
        dwellTicksRemaining: this.dwellTicksRemaining,
      };
    }

    // State Transition
    if (bestAction !== this.currentAction) {
      this.currentAction = bestAction;
      this.dwellTicksRemaining = this.minDwellTicks;
    }

    return {
      action: this.currentAction,
      actionScores: scores,
      explanation: `Selected ${this.currentAction} based on multi-objective utility optimization.`,
      dwellTicksRemaining: this.dwellTicksRemaining,
    };
  }
}
