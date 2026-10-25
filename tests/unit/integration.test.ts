import { describe, it, expect } from 'vitest';
import { SimEngine } from '../../src/sim/engine';
import { createDefaultWorld } from '../../src/sim/world';
import { computeCommState } from '../../src/sim/comm_model';
import { evaluateWaypointCapture } from '../../src/sim/mission';
import { validateScenario } from '../../src/sim/validation';
import disaster from '../../src/scenarios/disaster.json';
import { useSimStore } from '../../src/store/simStore';

describe('End-to-end simulation contracts', () => {
 it('return command physically moves toward home and remains latched', () => {
   const e = new SimEngine({ strategy: 'baseline' });
   e.uav.position = { x: 500, y: 200 }; e.uav.isHome = false;
   for (let i=0;i<300;i++) e.step(i===0?'SAFE_RETURN':undefined);
   expect(e.uav.position.x).toBeLessThan(250);
   expect(e.finished).toBe(true);
   const final = e.step(); expect(e.step()).toBe(final);
 });
 it('selected strategies produce different physical trajectories', () => {
   const base = new SimEngine({seed:42,strategy:'baseline'});
   const sky = new SimEngine({seed:42,strategy:'skylink_utility'});
   base.runHeadless(200); sky.runHeadless(200);
   expect(base.uav.position).not.toEqual(sky.uav.position);
 });
 it('engines isolate scenario objects and fault injection', () => {
   const original = structuredClone(disaster);
   const a = new SimEngine({world: disaster.world,waypoints:disaster.waypoints});
   const b = new SimEngine({world: disaster.world,waypoints:disaster.waypoints});
   a.world.towers[0].isOnline = false; a.waypoints[0].captured = true;
   expect(disaster).toEqual(original); expect(b.world.towers[0].isOnline).toBe(true);
 });
 it('offline serving towers are cleared even if every station is offline', () => {
   const w = createDefaultWorld(); w.towers.forEach(t => t.isOnline=false);
   const r = computeCommState(w.homePosition,w,w.towers[0].id);
   expect(r.servingTowerId).toBeNull(); expect(r.comm.throughputMbps).toBe(0);
 });
 it('reset preserves a selected scenario and clears injected faults', () => {
   useSimStore.getState().loadScenario(disaster);
   useSimStore.getState().engine.world.towers[0].isOnline = false;
   useSimStore.getState().reset(71);
   expect(useSimStore.getState().engine.world).toEqual(disaster.world);
   expect(useSimStore.getState().engine.waypoints.length).toBe(disaster.waypoints.length);
   expect(useSimStore.getState().engine.seed).toBe(71);
 });
 it('rejects malformed scenarios and accepts the preset', () => {
   expect(()=>validateScenario(disaster)).not.toThrow();
   expect(()=>validateScenario({...disaster, initialBatteryWh:-1})).toThrow();
   expect(()=>validateScenario({...disaster,waypoints:[{...disaster.waypoints[0],position:{x:NaN,y:0}}]})).toThrow();
 });
 it('does not capture uplink objectives in outage or after deadline', () => {
   const wp={id:'w',name:'test',position:{x:100,y:100},value:5,captured:false,needsUplink:true,deadlineSeconds:1};
   expect(evaluateWaypointCapture([wp],wp.position,0,1).capturedCount).toBe(0);
   expect(evaluateWaypointCapture([wp],wp.position,1,20).capturedCount).toBe(0);
   expect(evaluateWaypointCapture([wp],wp.position,1,5).capturedCount).toBe(1);
 });
});
