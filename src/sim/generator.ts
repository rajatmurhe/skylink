import { Scenario, Position2D } from '../types/sim';
import { createRNG } from './rng';
import { validateScenario } from './validation';

export const themes = { urban: 'Urban survey', mountain: 'Mountain rescue', wildfire: 'Wildfire observation', rescue: 'Search & rescue' } as const;
export type MapTheme = keyof typeof themes;
export type MapDifficulty = 'easy' | 'moderate' | 'difficult';

/** Synthetic RF test environments, not geographic maps or collision-safe flight plans. */
export function generateScenario(seed: number, theme: MapTheme, difficulty: MapDifficulty): Scenario {
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new Error('Map seed must be an integer from 0 to 4294967295.');
  const rng = createRNG(seed);
  const level = ['easy', 'moderate', 'difficult'].indexOf(difficulty);
  const size = 1600 + level * 200;
  const point = (): Position2D => ({ x: rng.nextInt(180, size - 180), y: rng.nextInt(180, size - 180) });
  const home = { x: rng.nextInt(150, 350), y: rng.nextInt(150, 350) };
  const waypoints: Scenario['waypoints'] = [];
  for (let i = 0; i < 4 + level; i++) {
    let p = point();
    for (let tries = 0; tries < 100 && [home, ...waypoints.map(w => w.position)].some(q => Math.hypot(p.x-q.x, p.y-q.y) < 180); tries++) p = point();
    waypoints.push({ id: `wp-${i}`, name: `${theme === 'rescue' || theme === 'mountain' ? 'Search sector' : 'Survey point'} ${i+1}`, position: p, value: rng.nextInt(4, 12), captured: false, needsUplink: i === 1 });
  }
  // Nearest-neighbour ordering keeps introductory missions compact.
  const ordered: typeof waypoints = [];
  let last = home;
  while (waypoints.length) {
    waypoints.sort((a,b) => Math.hypot(a.position.x-last.x,a.position.y-last.y)-Math.hypot(b.position.x-last.x,b.position.y-last.y));
    const next = waypoints.shift()!; ordered.push(next); last = next.position;
  }
  const obstacles: Scenario['world']['obstacles'] = [];
  const count = (theme === 'urban' ? 14 : theme === 'mountain' ? 5 : 8) + level * 3;
  for (let attempt = 0; obstacles.length < count && attempt < 500; attempt++) {
    const p = point();
    const width = rng.nextInt(90, theme === 'mountain' ? 380 : 200);
    const height = rng.nextInt(90, theme === 'mountain' ? 160 : 230);
    const bounds = { xMin: p.x, yMin: p.y, xMax: Math.min(size-80,p.x+width), yMax: Math.min(size-80,p.y+height) };
    if ([home,...ordered.map(w=>w.position)].some(q=>q.x>bounds.xMin-60&&q.x<bounds.xMax+60&&q.y>bounds.yMin-60&&q.y<bounds.yMax+60)) continue;
    obstacles.push({ id:`obs-${obstacles.length}`, name: `${theme === 'mountain' ? 'Ridge' : theme === 'urban' ? 'Building' : 'Vegetation'} ${obstacles.length+1}`, bounds, attenuationDb: rng.nextInt(8+level*3,18+level*5) });
  }
  const towers: Scenario['world']['towers'] = [home, ...Array.from({length: 3-level},point)].map((position,i)=>({ id:`tower-${i}`, name:i===0?'Base relay':`Relay ${i}`, position:{...position}, txPowerDbm:33, height:30, loadFactor:0.1+level*0.15, isOnline:true }));
  // Give uplink objectives a local relay; route coverage can still fail.
  for (const w of ordered.filter(w=>w.needsUplink)) towers.push({ id:`uplink-${w.id}`, name:'Objective relay', position:{x:w.position.x+25,y:w.position.y+25}, txPowerDbm:33,height:25,loadFactor:0.2,isOnline:true });
  const scenario: Scenario = {
    id:`generated-v1-${theme}-${difficulty}-${seed}`, name:`${themes[theme]} · ${seed}`, difficulty,
    description:`Generated v1 · ${theme} · map seed ${seed}. Synthetic RF obstacles and interference; no live terrain or weather.`,
    initialBatteryWh:100,
    world:{mapSize:{width:size,height:size},homePosition:home,geofence:{xMin:50,yMin:50,xMax:size-50,yMax:size-50},towers,obstacles,jammers:Array.from({length:level},(_,i)=>({id:`interference-${i}`,position:point(),radius:rng.nextInt(130,240),strengthDbm:-75+level*3}))},
    waypoints:ordered,
  };
  validateScenario(scenario);
  return scenario;
}
