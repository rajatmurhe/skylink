import { ActionType } from '../types/sim';

export const ACTIONS: ActionType[] = [
  'CONTINUE',
  'REPLAN',
  'RECOVER_CONNECTIVITY',
  'HOLD',
  'RESUME',
  'SAFE_RETURN',
];

export interface QTableJSON {
  numStates: number;
  numActions: number;
  qMatrix: number[][]; // 1440 x 6
}

export class QLearningAgent {
  public numStates = 1440;
  public numActions = 6;
  public qTable: number[][];
  public alpha = 0.1; // Learning rate
  public gamma = 0.95; // Discount factor
  public epsilon = 0.2; // Exploration rate

  constructor(initialQTable?: number[][]) {
    if (initialQTable && initialQTable.length === 1440) {
      this.qTable = initialQTable;
    } else {
      // Initialize zero Q-table
      this.qTable = Array.from({ length: 1440 }, () => new Array(6).fill(0));
    }
  }

  public selectAction(stateIndex: number, rngNext: () => number): ActionType {
    // Epsilon-greedy action selection
    if (rngNext() < this.epsilon) {
      const randomIdx = Math.floor(rngNext() * 6);
      return ACTIONS[randomIdx];
    }

    // Greedy action selection
    const stateScores = this.qTable[stateIndex];
    let bestIdx = 0;
    let maxVal = stateScores[0];

    for (let i = 1; i < 6; i++) {
      if (stateScores[i] > maxVal) {
        maxVal = stateScores[i];
        bestIdx = i;
      }
    }

    return ACTIONS[bestIdx];
  }

  public updateQValue(
    stateIndex: number,
    action: ActionType,
    reward: number,
    nextStateIndex: number,
    terminal = false
  ): void {
    const actionIdx = ACTIONS.indexOf(action);
    if (actionIdx === -1) return;

    const currentQ = this.qTable[stateIndex][actionIdx];
    const maxNextQ = Math.max(...this.qTable[nextStateIndex]);

    // Q-learning Bellman update equation
    const targetQ = reward + (terminal ? 0 : this.gamma * maxNextQ);
    this.qTable[stateIndex][actionIdx] = currentQ + this.alpha * (targetQ - currentQ);
  }

  public exportJSON(): QTableJSON {
    return {
      numStates: this.numStates,
      numActions: this.numActions,
      qMatrix: this.qTable,
    };
  }

  public importJSON(json: QTableJSON): void {
    if (json.qMatrix && json.qMatrix.length === 1440) {
      this.qTable = json.qMatrix;
    }
  }
}
