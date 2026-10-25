import {describe,it,expect} from 'vitest';
import {SimEngine} from '../../src/sim/engine';
import {validateScenario} from '../../src/sim/validation';
import {DEFAULT_CONTROL,controlMetrics} from '../../src/sim/control';
import disaster from '../../src/scenarios/disaster.json';
import urban from '../../src/scenarios/urban.json';
import wildfire from '../../src/scenarios/wildfire.json';
import mountain from '../../src/scenarios/mountain.json';

describe('Full scenario regression matrix',()=>{
 for(const scenario of [disaster,urban,wildfire,mountain]) for(const strategy of ['baseline','skylink_utility'] as const) {
  it(`${scenario.id}: ${strategy} stays finite and bounded over a full evaluation`,()=>{
   validateScenario(scenario);
   for(const seed of [0,42,5000]) {
    const e=new SimEngine({seed,strategy,world:scenario.world,waypoints:scenario.waypoints,initialBatteryWh:scenario.initialBatteryWh});
    let energy=e.uav.batteryWh,captured=0;
    for(let i=0;i<6000&&!e.finished;i++){
     const r=e.step();
     if(i%100===0||e.finished){
      expect([r.uav.position.x,r.uav.position.y,r.uav.batteryWh,r.comm.linkQuality,r.risk.riskScore].every(Number.isFinite)).toBe(true);
      expect(r.uav.batteryWh).toBeLessThanOrEqual(energy);expect(r.uav.batteryWh).toBeGreaterThanOrEqual(0);energy=r.uav.batteryWh;
      const f=e.world.geofence;expect(r.uav.position.x).toBeGreaterThanOrEqual(f.xMin);expect(r.uav.position.x).toBeLessThanOrEqual(f.xMax);expect(r.uav.position.y).toBeGreaterThanOrEqual(f.yMin);expect(r.uav.position.y).toBeLessThanOrEqual(f.yMax);
      const count=r.waypoints.filter(w=>w.captured).length;expect(count).toBeGreaterThanOrEqual(captured);captured=count;
     }
    }
    expect(e.recorder.getSummary()!.totalTicks).toBe(e.tick);
    if(e.finished){const pos={...e.uav.position};e.step();expect(e.uav.position).toEqual(pos);}
   }
  },20000);
 }
 it('replay preserves environment, UAV and objective state before mutation',()=>{
  const e=new SimEngine();const r=e.step();const copy=structuredClone(r);
  e.world.towers[0].isOnline=false;e.uav.position.x+=10;e.waypoints[0].value=100;
  const later=e.step();expect(r).toEqual(copy);expect(later.world!.towers[0].isOnline).toBe(false);expect(r.world!.towers[0].isOnline).toBe(true);
 });
 it('rejects duplicate or missing environment identifiers',()=>{
  const s=structuredClone(disaster);s.world.towers[1].id=s.world.towers[0].id;expect(()=>validateScenario(s)).toThrow();
  const invalid=structuredClone(disaster) as any;delete invalid.world.towers[0].id;expect(()=>validateScenario(invalid)).toThrow();
 });
 it('control metrics handle zero and negative commands without NaN',()=>{
  expect(controlMetrics({...DEFAULT_CONTROL,targetDeg:0}).overshoot).toBe(0);
  expect(controlMetrics({...DEFAULT_CONTROL,targetDeg:-15,disturbanceNm:0}).overshoot).toBeCloseTo(controlMetrics({...DEFAULT_CONTROL,targetDeg:15,disturbanceNm:0}).overshoot);
 });
});
