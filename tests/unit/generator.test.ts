import { describe, it, expect } from 'vitest';
import { generateScenario, themes, MapTheme, MapDifficulty } from '../../src/sim/generator';
import { validateScenario } from '../../src/sim/validation';
import { SimEngine } from '../../src/sim/engine';
describe('procedural environments',()=>{
 it('reproduces maps and varies geometry between seeds',()=>{
   expect(generateScenario(42,'urban','moderate')).toEqual(generateScenario(42,'urban','moderate'));
   expect(generateScenario(43,'urban','moderate').world).not.toEqual(generateScenario(42,'urban','moderate').world);
 });
 it('validates all themes and difficulties across seeds with clear objectives',()=>{
   for(const theme of Object.keys(themes) as MapTheme[]) for(const difficulty of ['easy','moderate','difficult'] as MapDifficulty[]) for(let seed=0;seed<25;seed++){
     const s=generateScenario(seed,theme,difficulty); expect(()=>validateScenario(s)).not.toThrow();
     for(const p of [s.world.homePosition,...s.waypoints.map(w=>w.position)]) expect(s.world.obstacles.some(o=>p.x>=o.bounds.xMin&&p.x<=o.bounds.xMax&&p.y>=o.bounds.yMin&&p.y<=o.bounds.yMax)).toBe(false);
   }
 });
 it('runs both strategies with independent copies of the same generated environment',()=>{
  const s=generateScenario(42,'mountain','moderate');
  const options={world:s.world,waypoints:s.waypoints,initialBatteryWh:s.initialBatteryWh,seed:42};
  for(const strategy of ['baseline','skylink_utility'] as const){
   const engine=new SimEngine({...options,strategy});
   for(let i=0;i<100;i++)engine.step();
   expect(Number.isFinite(engine.uav.batteryWh)).toBe(true);
   expect(s.waypoints.every(w=>!w.captured)).toBe(true);
  }
 });
 it('rejects invalid seeds',()=>{for(const seed of [-1,0.5,NaN,4294967296]) expect(()=>generateScenario(seed,'urban','easy')).toThrow();});
});
