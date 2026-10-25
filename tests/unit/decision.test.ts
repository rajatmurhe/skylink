import { describe, it, expect } from 'vitest';
import { BaselineDecisionEngine } from '../../src/decision/baseline';
import { DecisionStateMachine } from '../../src/decision/state_machine';
import { SimEngine } from '../../src/sim/engine';
import { createSampleWaypoints } from '../../src/sim/mission';
import { createDefaultWorld } from '../../src/sim/world';

describe('Phase 4: Planner, SkyLink Decision Engine & State Machine', () => {
  it('Baseline strategy aborts mission after 5 seconds of signal outage', () => {
    const baseline = new BaselineDecisionEngine();
    const waypoints = createSampleWaypoints();
    const uav = {
      position: { x: 500, y: 500 },
      velocity: { x: 0, y: 0 },
      speed: 0,
      headingRad: 0,
      batteryWh: 80,
      maxBatteryWh: 100,
      returnReserveWh: 20,
      isHome: false,
      isGeofenced: false,
    };

    const outageComm = {
      rssiDbm: -110,
      sinrDb: 2.0,
      linkQuality: 0.0,
      linkQualityEma: 0.0,
      predictedLinkQuality: 0.0,
      linkState: 'OUTAGE' as const,
      servingTowerId: null,
      packetLossProb: 0.9,
      latencyMs: 300,
      throughputMbps: 0,
      heartbeatMissedTicks: 10,
    };

    // First 50 ticks (5.0s) should continue or warn
    for (let t = 0; t < 50; t++) {
      baseline.decide(outageComm, uav, waypoints);
    }

    // Tick 51 must trigger abort and SAFE_RETURN
    const res = baseline.decide(outageComm, uav, waypoints);
    expect(res.action).toBe('SAFE_RETURN');
  });

  it('Decision state machine enforces minimum 30-tick dwell time to eliminate flip-flopping', () => {
    const sm = new DecisionStateMachine();
    const world = createDefaultWorld();
    const waypoints = createSampleWaypoints();
    const uav = {
      position: { x: 500, y: 500 },
      velocity: { x: 0, y: 0 },
      speed: 0,
      headingRad: 0,
      batteryWh: 80,
      maxBatteryWh: 100,
      returnReserveWh: 20,
      isHome: false,
      isGeofenced: false,
    };

    const commDegrading = {
      rssiDbm: -90,
      sinrDb: 10.0,
      linkQuality: 0.3,
      linkQualityEma: 0.3,
      predictedLinkQuality: 0.2,
      linkState: 'DEGRADING' as const,
      servingTowerId: 'tower_alpha',
      packetLossProb: 0.3,
      latencyMs: 80,
      throughputMbps: 5,
      heartbeatMissedTicks: 0,
    };

    // First decision step triggers action switch to REPLAN or RECOVER
    const firstDec = sm.stepDecision(commDegrading, uav, waypoints, world);
    expect(firstDec.dwellTicksRemaining).toBe(30);

    // Next 10 ticks must hold the same action due to dwell timer
    for (let i = 0; i < 10; i++) {
      const stepDec = sm.stepDecision(commDegrading, uav, waypoints, world);
      expect(stepDec.action).toBe(firstDec.action);
    }
  });

  it('100 deterministic simulation seeds never produce negative battery energy', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const engine = new SimEngine({ seed });
      const records = engine.runHeadless(300);

      records.forEach((r) => {
        // Battery must never drop below 0
        expect(r.uav.batteryWh).toBeGreaterThanOrEqual(0);
      });
    }
  });
});
