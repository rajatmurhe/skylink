import {it,expect} from 'vitest';
import {SimEngine} from '../../src/sim/engine';
import {generateScenario} from '../../src/sim/generator';
import disaster from '../../src/scenarios/disaster.json';
import {createInitialUAVState,updateUAVKinematics} from '../../src/sim/uav';
it('brakes and turns to converge on a short target instead of orbiting',()=>{
 let u=createInitialUAVState({x:0,y:0});u.speed=15;u.headingRad=Math.PI;
 for(let i=0;i<500;i++)u=updateUAVKinematics(u,{x:30,y:0},{x:0,y:0},.1);
 expect(Math.hypot(u.position.x-30,u.position.y)).toBeLessThan(2);
});
for(const s of [generateScenario(0,'urban','moderate'),disaster]) it(`bounded recovery returns on ${s.id}`,()=>{
 const e=new SimEngine({world:s.world,waypoints:s.waypoints,initialBatteryWh:s.initialBatteryWh,seed:0});
 e.runHeadless(6000);
 expect(e.recorder.getSummary()!.capturedValue).toBeGreaterThan(s.id.startsWith('generated') ? 14 : 5);
 expect(e.waypoints.some(w=>w.deferredReason && !w.captured)).toBe(true);
 expect(e.finished).toBe(true);expect(e.uav.isHome).toBe(true);expect(e.uav.batteryWh).toBeGreaterThan(0);
},20000);
