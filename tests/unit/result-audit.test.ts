import {describe,it,expect} from 'vitest';
import {generateScenario, themes, MapTheme} from '../../src/sim/generator';
import {SimEngine} from '../../src/sim/engine';
import {calculatePowerDrawW,calculateReturnReserveWh} from '../../src/sim/uav';
import {designMetrics} from '../../src/sim/control';

describe('Independent result reconciliation',()=>{
 for(const theme of Object.keys(themes) as MapTheme[]) for(const difficulty of ['easy','moderate','difficult'] as const) {
  it(`${theme}/${difficulty}: reconciles every recorded tick and aggregate for both strategies`,()=>{
   const s=generateScenario(123,theme,difficulty);
   for(const strategy of ['baseline','skylink_utility'] as const){
    const e=new SimEngine({world:s.world,waypoints:s.waypoints,initialBatteryWh:s.initialBatteryWh,seed:0,strategy});
    let prevEnergy=s.initialBatteryWh;
    for(let i=0;i<6000&&!e.finished;i++){
     const r=e.step();
     if(!Number.isFinite(r.uav.batteryWh)||r.uav.batteryWh>prevEnergy||r.uav.batteryWh<0) throw new Error(`Invalid energy at tick ${r.tick}`);
     if(Math.abs(r.uav.returnReserveWh-calculateReturnReserveWh(r.uav.position,s.world.homePosition))>1e-8) throw new Error('Reserve mismatch');
     if(r.uav.isHome !== (Math.hypot(r.uav.position.x-s.world.homePosition.x,r.uav.position.y-s.world.homePosition.y)<15)) throw new Error('Home mismatch');
     prevEnergy=r.uav.batteryWh;
    }
    const records=e.recorder.getRecords(), summary=e.recorder.getSummary()!;
    expect(summary.totalOutageSeconds).toBeCloseTo(records.filter(r=>r.comm.linkState==='OUTAGE').length/10,8);
    expect(summary.capturedValue).toBe(e.waypoints.filter(w=>w.captured).reduce((sum,w)=>sum+w.value,0));
    expect(summary.totalValue).toBe(s.waypoints.reduce((sum,w)=>sum+w.value,0));
    expect(summary.totalTimeSeconds).toBeCloseTo(records.length/10,8);
    expect(summary.remainingBatteryWh).toBe(e.uav.batteryWh);
   }
  },30000);
 }
 it('headless output never duplicates terminal records',()=>{
  const e=new SimEngine({waypoints:[]});const rows=e.runHeadless(100);
  expect(rows.length).toBe(e.recorder.getRecords().length);expect(new Set(rows.map(r=>r.tick)).size).toBe(rows.length);
  expect(e.runHeadless(100)).toEqual([]);
 });
 it('matches independent dimensional calculations',()=>{
  expect(calculatePowerDrawW(10)).toBe(190);
  expect(calculateReturnReserveWh({x:1200,y:0},{x:0,y:0})).toBeCloseTo((150+.4*144)*100/3600*1.25);
  const d=designMetrics(1.4,4,5000,7,220,12);
  expect(d.energyWh).toBe(74);expect(d.estimatedMinutes).toBeCloseTo(60*.8*74/232);expect(d.currentA).toBeCloseTo(232/14.8);
 });
});
