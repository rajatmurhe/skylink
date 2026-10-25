import { createRNG } from '../sim/rng';
import { QLearningAgent } from '../decision/qlearning';
import { discretizeState, calculateStepReward } from '../decision/rl_env';
import { SimEngine } from '../sim/engine';

export interface TrainWorkerProgress {
  episode: number;
  totalEpisodes: number;
  avgReward: number;
  epsilon: number;
}

self.onmessage = (e: MessageEvent) => {
  const { episodes = 500, initialQTable } = e.data;

  const rng = createRNG(2026);
  const agent = new QLearningAgent(initialQTable);
  const rewardHistory: number[] = [];

  for (let ep = 1; ep <= episodes; ep++) {
    const seed = 1000 + ep;
    const engine = new SimEngine({ seed });

    let episodeReward = 0;
    let done = false;
    let tickCount = 0;

    while (!done && tickCount < 800) {
      tickCount++;
      const currentRec = engine.recorder.getRecords().slice(-1)[0] || engine.step();
      const stateObj = discretizeState(currentRec.comm, currentRec.uav, currentRec.waypoints, currentRec.decision.action === 'RECOVER_CONNECTIVITY', engine.world.homePosition);

      const action = agent.selectAction(stateObj.stateIndex, () => rng.next());
      const nextRec = engine.step(action);

      const newlyCapturedVal = nextRec.waypoints
        .filter((w) => w.captured && w.capturedAtTick === nextRec.tick)
        .reduce((a, b) => a + b.value, 0);

      const isComplete = nextRec.waypoints.every((w) => w.captured);
      const stepReward = calculateStepReward(
        action,
        nextRec.comm,
        nextRec.uav,
        newlyCapturedVal,
        isComplete && !currentRec.waypoints.every(w => w.captured)
      );

      episodeReward += stepReward;

      const nextStateObj = discretizeState(nextRec.comm, nextRec.uav, nextRec.waypoints, nextRec.decision.action === 'RECOVER_CONNECTIVITY', engine.world.homePosition);
      agent.updateQValue(stateObj.stateIndex, action, stepReward, nextStateObj.stateIndex, engine.finished);

      if (engine.finished) {
        done = true;
      }
    }

    rewardHistory.push(episodeReward);

    // Epsilon decay
    agent.epsilon = Math.max(0.05, agent.epsilon * 0.995);

    if (ep % 10 === 0 || ep === episodes) {
      const recentRewards = rewardHistory.slice(-50);
      const avgReward = recentRewards.reduce((a, b) => a + b, 0) / recentRewards.length;

      const progress: TrainWorkerProgress = {
        episode: ep,
        totalEpisodes: episodes,
        avgReward: parseFloat(avgReward.toFixed(2)),
        epsilon: parseFloat(agent.epsilon.toFixed(3)),
      };

      self.postMessage({ type: 'PROGRESS', progress });
    }
  }

  self.postMessage({ type: 'COMPLETE', qTable: agent.exportJSON() });
};
