import { describe, it, expect } from 'vitest';
import { discretizeState, calculateStepReward } from '../../src/decision/rl_env';
import { QLearningAgent } from '../../src/decision/qlearning';
import { createSampleWaypoints } from '../../src/sim/mission';

describe('Phase 8: AI Lab & Tabular Q Learning Framework', () => {
  it('State discretizer outputs valid index in range [0, 1439]', () => {
    const comm = {
      rssiDbm: -75,
      sinrDb: 15,
      linkQuality: 0.6,
      linkQualityEma: 0.6,
      predictedLinkQuality: 0.55,
      linkState: 'DEGRADING' as const,
      servingTowerId: 'tower_alpha',
      packetLossProb: 0.1,
      latencyMs: 30,
      throughputMbps: 12,
      heartbeatMissedTicks: 0,
    };

    const uav = {
      position: { x: 800, y: 800 },
      velocity: { x: 5, y: 5 },
      speed: 7.0,
      headingRad: 0,
      batteryWh: 70,
      maxBatteryWh: 100,
      returnReserveWh: 20,
      isHome: false,
      isGeofenced: false,
    };

    const waypoints = createSampleWaypoints();

    const disc = discretizeState(comm, uav, waypoints);
    expect(disc.stateIndex).toBeGreaterThanOrEqual(0);
    expect(disc.stateIndex).toBeLessThan(1440);
  });

  it('Q learning agent updates Q values according to Bellman equation', () => {
    const agent = new QLearningAgent();
    const initialQ = agent.qTable[10][0];

    // Bellman update step
    agent.updateQValue(10, 'CONTINUE', 50.0, 15);
    const updatedQ = agent.qTable[10][0];

    expect(updatedQ).toBeGreaterThan(initialQ);
  });

  it('Agent Q table exports and imports JSON cleanly', () => {
    const agent1 = new QLearningAgent();
    agent1.qTable[5][2] = 42.5;

    const exported = agent1.exportJSON();
    const agent2 = new QLearningAgent();
    agent2.importJSON(exported);

    expect(agent2.qTable[5][2]).toBe(42.5);
  });
});
