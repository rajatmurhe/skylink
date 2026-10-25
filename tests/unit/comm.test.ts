import { describe, it, expect } from 'vitest';
import { computeCommState, sinrToLinkQuality } from '../../src/sim/comm_model';
import { CommMonitor } from '../../src/sim/monitor';
import { createDefaultWorld } from '../../src/sim/world';

describe('Phase 2: Communication Physics & Link Degradation Monitor', () => {
  it('Link quality Q decreases with distance from tower', () => {
    const world = createDefaultWorld();
    world.towers = [world.towers[0]]; // Only Tower Alpha at (300, 400)
    world.obstacles = [];
    world.jammers = [];

    const closePos = { x: 310, y: 410 };
    const farPos = { x: 1200, y: 1400 };

    const closeComm = computeCommState(closePos, world, null).comm;
    const farComm = computeCommState(farPos, world, null).comm;

    expect(closeComm.linkQuality).toBeGreaterThan(farComm.linkQuality);
    expect(closeComm.rssiDbm).toBeGreaterThan(farComm.rssiDbm);
  });

  it('Obstacle attenuation drops RSSI and link quality when line of sight is blocked', () => {
    const world = createDefaultWorld();
    world.towers = [{
      id: 'tower_test',
      name: 'Tower Test',
      position: { x: 500, y: 1000 },
      txPowerDbm: 33,
      height: 30,
      loadFactor: 0,
      isOnline: true,
    }];
    world.jammers = [];
    world.obstacles = [{
      id: 'obs_wall',
      name: 'Concrete Wall',
      bounds: { xMin: 700, xMax: 800, yMin: 0, yMax: 2000 },
      attenuationDb: 25,
    }];

    const unblockedPos = { x: 650, y: 1000 };
    const blockedPos = { x: 850, y: 1000 };

    const unblockedComm = computeCommState(unblockedPos, world, null).comm;
    const blockedComm = computeCommState(blockedPos, world, null).comm;

    expect(unblockedComm.rssiDbm).toBeGreaterThan(blockedComm.rssiDbm + 20);
    expect(unblockedComm.linkQuality).toBeGreaterThan(blockedComm.linkQuality);
  });

  it('Jammer interference drops SINR and forces link state into outage', () => {
    const world = createDefaultWorld();
    world.jammers = [{
      id: 'jam_test',
      position: { x: 500, y: 500 },
      radius: 300,
      strengthDbm: -40,
    }];

    const insideJammerPos = { x: 510, y: 510 };
    const comm = computeCommState(insideJammerPos, world, null).comm;

    expect(comm.sinrDb).toBeLessThan(5.0);
    expect(comm.linkQuality).toBe(0);
  });

  it('Early warning monitor predicts Q drop 5 seconds ahead', () => {
    const monitor = new CommMonitor();
    monitor.reset(1.0);

    // Simulate steady degradation over 2 seconds (20 ticks)
    for (let t = 0; t < 20; t++) {
      const currentQ = 1.0 - t * 0.025; // Dropping from 1.0 to 0.5
      monitor.update(currentQ);
    }

    const finalState = monitor.update(0.5);
    expect(finalState.predictedQ).toBeLessThan(0.45);
    expect(finalState.linkState).toBe('DEGRADING');
  });
});
